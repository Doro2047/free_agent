import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, ToolCall } from '@/types';
import { streamMessage as apiStreamMessage, sendMessage as apiSendMessage, getSessionMessages, listSessions } from '@/api/chat';
import { toast } from 'sonner';
import { debounce, errorTracker } from '@/utils';

interface UseChatOptions {
  maxMessages?: number;
  onError?: (error: Error) => void;
  onToken?: (token: string) => void;
  onComplete?: (sessionId: string) => void;
}

interface UseChatReturn {
  messages: Message[];
  sessions: { id: string; title: string; createdAt: string; updatedAt: string; messageCount: number }[];
  isStreaming: boolean;
  currentSessionId: string | null;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  loadHistory: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  clearMessages: () => void;
  deleteMessage: (messageId: string) => void;
  resendMessage: (content: string) => Promise<void>;
}

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { maxMessages = 100, onError, onToken, onComplete } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<{ id: string; title: string; createdAt: string; updatedAt: string; messageCount: number }[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamingMessageIdRef.current) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageIdRef.current ? { ...msg, isStreaming: false } : msg
        )
      );
      streamingMessageIdRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const appendToken = useCallback((token: string) => {
    setMessages((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex < 0) return prev;
      const lastMsg = prev[lastIndex];
      if (lastMsg.id === streamingMessageIdRef.current) {
        const updated = [...prev];
        updated[lastIndex] = { ...lastMsg, content: lastMsg.content + token };
        return updated;
      }
      return prev;
    });
    onToken?.(token);
  }, [onToken]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    cleanup();

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev.slice(-maxMessages + 1), userMessage, assistantMessage]);
    setCurrentSessionId((prev) => prev);
    setError(null);
    setIsStreaming(true);
    streamingMessageIdRef.current = assistantMessageId;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await new Promise<void>((resolve, reject) => {
        apiStreamMessage(content, currentSessionId || undefined, {
          onToken: (token) => appendToken(token),
          onToolCall: () => {},
          onComplete: (sessionId) => {
            setCurrentSessionId(sessionId || currentSessionId);
            onComplete?.(sessionId || currentSessionId || '');
            resolve();
          },
          onError: (err) => {
            const error = err instanceof Error ? err : new Error(String(err));
            errorTracker.log(error, { context: 'chat' });
            setError(error.message);
            onError?.(error);
            reject(error);
          },
        });

        controller.signal.addEventListener('abort', () => {
          resolve();
        });
      });
    } finally {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessageId.current ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsStreaming(false);
      abortControllerRef.current = null;
      streamingMessageIdRef.current = null;
    }
  }, [currentSessionId, maxMessages, cleanup, appendToken, onError, onComplete]);

  const stopStreaming = useCallback(() => {
    cleanup();
    toast.info('已停止生成');
  }, [cleanup]);

  const loadHistory = useCallback(async (sessionId: string) => {
    try {
      const history = await getSessionMessages(sessionId);
      setMessages(history);
      setCurrentSessionId(sessionId);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载历史记录失败');
      errorTracker.log(error, { context: 'loadHistory' });
      setError(error.message);
      toast.error('加载历史记录失败');
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await listSessions();
      setSessions(sessionList);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('加载会话列表失败');
      errorTracker.log(error, { context: 'loadSessions' });
      toast.error(error.message);
    }
  }, []);

  const clearMessages = useCallback(() => {
    cleanup();
    setMessages([]);
    setError(null);
  }, [cleanup]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  const resendMessage = useCallback(async (content: string) => {
    await sendMessage(content);
  }, [sendMessage]);

  return {
    messages,
    sessions,
    isStreaming,
    currentSessionId,
    error,
    sendMessage,
    stopStreaming,
    loadHistory,
    loadSessions,
    clearMessages,
    deleteMessage,
    resendMessage,
  };
}

export function useAutoScroll(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);

  useEffect(() => {
    if (shouldScrollRef.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [deps]);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    shouldScrollRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  return { containerRef, scrollToBottom, handleScroll };
}

export function useMessageGroups(messages: Message[]) {
  const groups = useRef<Message[][]>([]);

  useEffect(() => {
    const newGroups: Message[][] = [];
    let currentGroup: Message[] = [];

    messages.forEach((msg, index) => {
      if (index === 0 || msg.role !== messages[index - 1].role) {
        if (currentGroup.length > 0) {
          newGroups.push(currentGroup);
        }
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      newGroups.push(currentGroup);
    }

    groups.current = newGroups;
  }, [messages]);

  return groups.current;
}
