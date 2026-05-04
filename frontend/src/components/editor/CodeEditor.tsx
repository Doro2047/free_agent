import { useMemo, useCallback } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { useFileStore } from '@/stores/fileStore';
import { useAppStore } from '@/stores/appStore';
import { Code2, FileText, Loader2 } from 'lucide-react';
import { getLanguageFromPath, getFileNameFromPath } from '@/utils/helpers';

export function CodeEditor() {
  const { activeFilePath, openFiles, updateFileContent, saveFile } = useFileStore();
  const theme = useAppStore((s) => s.theme);
  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const content = activeFile?.content || '';

  const language = useMemo(() => {
    return getLanguageFromPath(activeFilePath);
  }, [activeFilePath]);

  const handleChange = useCallback((value: string | undefined) => {
    if (activeFilePath && value !== undefined) {
      updateFileContent(activeFilePath, value);
    }
  }, [activeFilePath, updateFileContent]);

  const handleEditorMount: OnMount = useCallback((editor: unknown, monaco: Monaco) => {
    monaco.editor.defineTheme('codecraft-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#e4e4e7',
        'editor.lineHighlightBackground': '#27272a',
        'editor.selectionBackground': '#3f3f46',
        'editorCursor.foreground': '#a1a1aa',
        'editorLineNumber.foreground': '#71717a',
        'editorLineNumber.activeForeground': '#a1a1aa',
      },
    });

    monaco.editor.defineTheme('codecraft-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#18181b',
        'editor.lineHighlightBackground': '#f4f4f5',
        'editor.selectionBackground': '#e4e4e7',
        'editorCursor.foreground': '#3f3f46',
        'editorLineNumber.foreground': '#a1a1aa',
        'editorLineNumber.activeForeground': '#3f3f46',
      },
    });

    const editorInstance = editor as { addCommand: (keybinding: number, handler: () => void) => void };
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFilePath) {
        saveFile(activeFilePath);
      }
    });
  }, [activeFilePath, saveFile]);

  const monacoTheme = theme === 'dark' ? 'codecraft-dark' : 'codecraft-light';

  if (!activeFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground/40 animate-fade-in">
        <div className="rounded-lg bg-muted/15 p-4 mb-2.5">
          <Code2 className="h-6 w-6 opacity-30" strokeWidth={1.5} />
        </div>
        <span className="text-xs font-medium">选择文件以编辑</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 bg-muted/20">
        <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground/80 truncate">
          {getFileNameFromPath(activeFilePath)}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground/50 uppercase">
          {language}
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content}
          onChange={handleChange}
          theme={monacoTheme}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">加载编辑器...</span>
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace",
            fontLigatures: true,
            lineNumbers: 'on',
            lineHeight: 1.6,
            renderLineHighlight: 'line',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            padding: { top: 8, bottom: 8 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            folding: true,
            foldingHighlight: true,
            showFoldingControls: 'mouseover',
            matchBrackets: 'always',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: false,
            renderWhitespace: 'selection',
            contextmenu: true,
            mouseWheelZoom: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}
