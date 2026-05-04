import { Monaco } from '@monaco-editor/react';

export interface LanguageServiceConfig {
  enableTypeScript: boolean;
  enableJavaScript: boolean;
  enableCSS: boolean;
  enableHTML: boolean;
  enableJSON: boolean;
  enablePython: boolean;
  enableRust: boolean;
  customLanguages?: Record<string, string[]>;
}

export const defaultLanguageServiceConfig: LanguageServiceConfig = {
  enableTypeScript: true,
  enableJavaScript: true,
  enableCSS: true,
  enableHTML: true,
  enableJSON: true,
  enablePython: true,
  enableRust: true,
};

export function configureMonacoLanguageServices(
  monaco: Monaco,
  config: Partial<LanguageServiceConfig> = {}
): void {
  const finalConfig = { ...defaultLanguageServiceConfig, ...config };

  if (finalConfig.enableTypeScript) {
    configureTypeScript(monaco);
  }

  if (finalConfig.enableJavaScript) {
    configureJavaScript(monaco);
  }

  if (finalConfig.enableCSS) {
    configureCSS(monaco);
  }

  if (finalConfig.enableHTML) {
    configureHTML(monaco);
  }

  if (finalConfig.enableJSON) {
    configureJSON(monaco);
  }

  if (finalConfig.enablePython) {
    configurePython(monaco);
  }

  if (finalConfig.enableRust) {
    configureRust(monaco);
  }

  if (finalConfig.customLanguages) {
    configureCustomLanguages(monaco, finalConfig.customLanguages);
  }
}

function configureTypeScript(monaco: Monaco): void {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    strict: false,
    baseUrl: '.',
    paths: {
      '@/*': ['src/*'],
      '@components/*': ['src/components/*'],
      '@stores/*': ['src/stores/*'],
      '@utils/*': ['src/utils/*'],
      '@hooks/*': ['src/hooks/*'],
      '@api/*': ['src/api/*'],
    },
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  monaco.languages.typescript.typescriptDefaults.setInlayHintsOptions({
    includeInlayParameterNameHints: 'literals',
    includeInlayParameterTypeHints: false,
    includeInlayVariableTypeHints: true,
    includeInlayPropertyDeclarationTypeHints: true,
    includeInlayFunctionLikeReturnTypeHints: true,
    includeInlayEnumMemberValueHints: true,
  });

  monaco.languages.typescript.typescriptDefaults.onCodeokkaDetection((model, offset) => {
    const signature = model.getValueInRange({
      startLineNumber: model.getLineCount(),
      startColumn: 1,
      endLineNumber: model.getLineCount(),
      endColumn: model.getLineLength(model.getLineCount()) + 1,
    });
    return undefined;
  });
}

function configureJavaScript(monaco: Monaco): void {
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    allowJs: true,
    checkJs: true,
    typeRoots: ['node_modules/@types'],
    strict: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });

  monaco.languages.typescript.javascriptDefaults.setInlayHintsOptions({
    includeInlayParameterNameHints: 'literals',
    includeInlayParameterTypeHints: false,
    includeInlayVariableTypeHints: true,
    includeInlayPropertyDeclarationTypeHints: true,
    includeInlayFunctionLikeReturnTypeHints: true,
    includeInlayEnumMemberValueHints: true,
  });
}

function configureCSS(monaco: Monaco): void {
  monaco.languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: 'warning',
      vendorPrefix: 'warning',
      duplicateProperties: 'warning',
      emptyRules: 'warning',
      importStatelessFunction: 'warning',
      zeroUnits: 'warning',
      float: 'warning',
      fontFaceProperties: 'warning',
      hexColorLength: 'error',
      argumentsInColorFunction: 'error',
      unknownProperties: 'warning',
      validProperties: [
        'align-content',
        'align-items',
        'align-self',
        'animation',
        'animation-delay',
        'animation-direction',
        'animation-duration',
        'animation-fill-mode',
        'animation-iteration-count',
        'animation-name',
        'animation-play-state',
        'animation-timing-function',
        'backdrop-filter',
        'background',
        'background-attachment',
        'background-blend-mode',
        'background-clip',
        'background-color',
        'background-image',
        'background-origin',
        'background-position',
        'background-repeat',
        'background-size',
        'border',
        'border-bottom',
        'border-bottom-color',
        'border-bottom-left-radius',
        'border-bottom-right-radius',
        'border-bottom-style',
        'border-bottom-width',
        'border-collapse',
        'border-color',
        'border-image',
        'border-image-outset',
        'border-image-repeat',
        'border-image-slice',
        'border-image-source',
        'border-image-width',
        'border-left',
        'border-left-color',
        'border-left-style',
        'border-left-width',
        'border-radius',
        'border-right',
        'border-right-color',
        'border-right-style',
        'border-right-width',
        'border-spacing',
        'border-style',
        'border-top',
        'border-top-color',
        'border-top-left-radius',
        'border-top-right-radius',
        'border-top-style',
        'border-top-width',
        'border-width',
        'bottom',
        'box-shadow',
        'box-sizing',
        'break-after',
        'break-before',
        'break-inside',
        'caption-side',
        'clear',
        'clip',
        'clip-path',
        'color',
        'column-count',
        'column-fill',
        'column-gap',
        'column-rule',
        'column-rule-color',
        'column-rule-style',
        'column-rule-width',
        'column-span',
        'column-width',
        'columns',
        'content',
        'counter-increment',
        'counter-reset',
        'cursor',
        'display',
        'empty-cells',
        'filter',
        'flex',
        'flex-basis',
        'flex-direction',
        'flex-flow',
        'flex-grow',
        'flex-shrink',
        'flex-wrap',
        'float',
        'font',
        'font-family',
        'font-feature-settings',
        'font-kerning',
        'font-size',
        'font-size-adjust',
        'font-stretch',
        'font-style',
        'font-variant',
        'font-variant-alternates',
        'font-variant-caps',
        'font-variant-east-asian',
        'font-variant-ligatures',
        'font-variant-numeric',
        'font-variant-position',
        'font-weight',
        'grid',
        'grid-area',
        'grid-auto-columns',
        'grid-auto-flow',
        'grid-auto-rows',
        'grid-column',
        'grid-column-end',
        'grid-column-gap',
        'grid-column-start',
        'grid-gap',
        'grid-row',
        'grid-row-end',
        'grid-row-gap',
        'grid-row-start',
        'grid-template',
        'grid-template-areas',
        'grid-template-columns',
        'grid-template-rows',
        'height',
        'hyphens',
        'image-rendering',
        'justify-content',
        'justify-items',
        'justify-self',
        'left',
        'letter-spacing',
        'line-height',
        'list-style',
        'list-style-image',
        'list-style-position',
        'list-style-type',
        'margin',
        'margin-bottom',
        'margin-left',
        'margin-right',
        'margin-top',
        'max-height',
        'max-width',
        'min-height',
        'min-width',
        'mix-blend-mode',
        'object-fit',
        'object-position',
        'opacity',
        'order',
        'orphans',
        'outline',
        'outline-color',
        'outline-offset',
        'outline-style',
        'outline-width',
        'overflow',
        'overflow-wrap',
        'overflow-x',
        'overflow-y',
        'padding',
        'padding-bottom',
        'padding-left',
        'padding-right',
        'padding-top',
        'page-break-after',
        'page-break-before',
        'page-break-inside',
        'perspective',
        'perspective-origin',
        'pointer-events',
        'position',
        'quotes',
        'resize',
        'right',
        'scroll-behavior',
        'tab-size',
        'table-layout',
        'text-align',
        'text-align-last',
        'text-combine-upright',
        'text-decoration',
        'text-decoration-color',
        'text-decoration-line',
        'text-decoration-skip',
        'text-decoration-style',
        'text-emphasis',
        'text-emphasis-color',
        'text-emphasis-position',
        'text-emphasis-style',
        'text-indent',
        'text-justify',
        'text-orientation',
        'text-overflow',
        'text-rendering',
        'text-shadow',
        'text-transform',
        'text-underline-position',
        'top',
        'transform',
        'transform-origin',
        'transform-style',
        'transition',
        'transition-delay',
        'transition-duration',
        'transition-property',
        'transition-timing-function',
        'unicode-bidi',
        'user-select',
        'vertical-align',
        'visibility',
        'white-space',
        'widows',
        'width',
        'will-change',
        'word-break',
        'word-spacing',
        'writing-mode',
        'z-index',
      ],
    },
  });
}

function configureHTML(monaco: Monaco): void {
  monaco.languages.html.htmlDefaults.setOptions({
    format: {
      tabSize: 2,
      insertSpaces: true,
      wrapLineLength: 120,
      unformatted: 'default',
      contentUnformatted: 'pre, code, textarea',
      indentInnerHtml: false,
      preserveNewLines: true,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: 'head, body, /html',
      wrapAttributes: 'auto',
    },
    suggest: {
      html5: true,
    },
    quickSuggestions: {
      other: true,
      strings: true,
    },
    tabSize: 2,
  });
}

function configureJSON(monaco: Monaco): void {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [],
    allowComments: false,
    enableSchemaRequest: true,
  });

  monaco.languages.json.jsonDefaults.setModeConfiguration({
    diagnostics: true,
    suggestions: true,
    completionItems: true,
    documentSymbols: true,
    tokens: true,
    colors: true,
    folding: true,
    hovers: true,
  });
}

function configurePython(monaco: Monaco): void {
  monaco.languages.setLanguageConfiguration('python', {
    comments: {
      lineComment: '#',
      blockComment: ["'''", "'''"],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
      { open: '"""', close: '"""' },
      { open: "'''", close: "'''" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: '`', close: '`' },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*:\s*[^{[^}]*$/,
      decreaseIndentPattern: /^\s*(elif|else|except|finally|with)\b.*$/,
    },
  });
}

function configureRust(monaco: Monaco): void {
  monaco.languages.setLanguageConfiguration('rust', {
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    indentationRules: {
      increaseIndentPattern: /^.*\{[^}]*$/,
      decreaseIndentPattern: /^\s*\}.*$/,
    },
  });
}

function configureCustomLanguages(
  monaco: Monaco,
  languages: Record<string, string[]>
): void {
  Object.entries(languages).forEach(([language, extensions]) => {
    if (!monaco.languages.getLanguages().some((lang) => lang.id === language)) {
      monaco.languages.register({ id: language, extensions });
    }
  });
}

export function registerCodeActions(
  monaco: Monaco,
  language: string,
  actions: Array<{
    title: string;
    kind: string;
    action: (model: Parameters<typeof monaco.editor.createModel>[0], range: Parameters<typeof monaco.editor.createModel>[1]) => void;
  }>
): void {
  monaco.languages.registerCodeActionProvider(language, {
    provideCodeActions: (model, range, context, token) => {
      const codeActions = actions
        .filter((action) =>
          context.markers.some(
            (marker) =>
              marker.range.startLineNumber >= range.startLineNumber &&
              marker.range.endLineNumber <= range.endLineNumber
          )
        )
        .map((action) => ({
          title: action.title,
          kind: monaco.CodeActionKind[action.kind as keyof typeof monaco.CodeActionKind] || monaco.CodeActionKind.QuickFix,
          command: {
            id: `custom.${action.title.replace(/\s+/g, '')}`,
            title: action.title,
          },
        }));

      return {
        actions: codeActions,
        dispose: () => {},
      };
    },
  });
}

export function registerCompletionProvider(
  monaco: Monaco,
  language: string,
  completions: Array<{
    label: string;
    kind: string;
    insertText: string;
    detail?: string;
    documentation?: string;
  }>
): void {
  monaco.languages.registerCompletionItemProvider(language, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = completions.map((completion) => ({
        label: completion.label,
        kind: monaco.languages.CompletionItemKind[completion.kind as keyof typeof monaco.languages.CompletionItemKind] || monaco.languages.CompletionItemKind.Text,
        insertText: completion.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail: completion.detail,
        documentation: completion.documentation ? { value: completion.documentation, isTrusted: true } : undefined,
        range,
      }));

      return { suggestions, dispose: () => {} };
    },
  });
}
