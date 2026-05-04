import { useMemo, useCallback, useEffect, useState } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { useFileStore } from '@/stores/fileStore';
import { useAppStore } from '@/stores/appStore';
import { Code2, FileText, Loader2 } from 'lucide-react';
import { getLanguageFromPath, getFileNameFromPath } from '@/utils/helpers';

export function CodeEditor() {
  const { activeFilePath, openFiles, updateFileContent, saveFile } = useFileStore();
  const theme = useAppStore((s) => s.theme);
  const [isEditorReady, setIsEditorReady] = useState(false);
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

  const handleEditorMount: OnMount = useCallback((editor, monaco: Monaco) => {
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

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFilePath) {
        saveFile(activeFilePath);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      const selection = editor.getSelection();
      if (selection) {
        const model = editor.getModel();
        if (model) {
          const selectedText = model.getValueInRange(selection);
          const word = model.getWordAtPosition(selection.getStartPosition());
          if (word) {
            const matches = model.findMatches(word.word, true, false, false, null, true);
            let occurrences = 0;
            const selections: Monaco.IRange[] = [];
            for (const match of matches) {
              if (match.range.startLineNumber === selection.startLineNumber) continue;
              occurrences++;
              if (occurrences <= 10) {
                selections.push(match.range);
              }
            }
            if (selections.length > 0) {
              editor.setSelections(selections);
            }
          }
        }
      }
    });

    setIsEditorReady(true);
  }, [activeFilePath, saveFile]);

  const monacoTheme = theme === 'dark' ? 'codecraft-dark' : 'codecraft-light';

  const editorOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace",
    fontLigatures: true,
    lineNumbers: 'on' as const,
    lineHeight: 1.6,
    renderLineHighlight: 'line' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on' as const,
    padding: { top: 8, bottom: 8 },
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    smoothScrolling: true,
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showConstants: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showEnums: true,
      showEnumMembers: true,
      showWords: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showSnippets: true,
    },
    quickSuggestions: {
      other: true,
      comments: false,
      strings: true,
    },
    parameterHints: {
      enabled: true,
      cycle: true,
    },
    folding: true,
    foldingHighlight: true,
    showFoldingControls: 'mouseover' as const,
    matchBrackets: 'always' as const,
    autoClosingBrackets: 'always' as const,
    autoClosingQuotes: 'always' as const,
    autoIndent: 'full' as const,
    formatOnPaste: true,
    formatOnType: false,
    renderWhitespace: 'selection' as const,
    contextmenu: true,
    mouseWheelZoom: true,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    inlayHints: {
      enabled: 'on' as const,
      padding: true,
    },
    hover: {
      enabled: true,
      delay: 300,
    },
    acceptSuggestionOnEnter: 'on' as const,
    tabCompletion: 'on' as const,
    snippetSuggestions: 'top' as const,
  }), []);

  useEffect(() => {
    return () => {
      setIsEditorReady(false);
    };
  }, [activeFilePath]);

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
          options={editorOptions}
        />
      </div>
    </div>
  );
}
