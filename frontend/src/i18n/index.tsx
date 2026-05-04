import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export type Locale = 'en' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'ar';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  direction?: 'ltr' | 'rtl';
  dateFormat?: string;
  numberFormat?: Intl.NumberFormatOptions;
  pluralRules?: Intl.PluralRulesOptions;
}

export const SUPPORTED_LOCALES: Record<Locale, LocaleConfig> = {
  en: { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
  'zh-CN': { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr' },
  'zh-TW': { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr' },
  ja: { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr' },
  ko: { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr' },
  es: { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
  fr: { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  de: { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
  ru: { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr' },
  ar: { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl' },
};

export interface TranslationOptions {
  count?: number;
  gender?: 'male' | 'female' | 'other';
  [key: string]: unknown;
}

export type TranslationValue = string | Record<string, unknown>;
export type TranslationMap = Record<string, TranslationValue>;

export interface TranslationResult {
  text: string;
  locale: Locale;
  namespace?: string;
}

export class I18n {
  private translations: Map<string, TranslationMap> = new Map();
  private currentLocale: Locale = 'en';
  private defaultLocale: Locale = 'en';
  private fallbackLocale: Locale = 'en';
  private listeners: Set<() => void> = new Set();
  private loadedLocales: Set<Locale> = new Set();

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('locale') as Locale;
      if (savedLocale && SUPPORTED_LOCALES[savedLocale]) {
        this.currentLocale = savedLocale;
      } else {
        const browserLocale = navigator.language;
        const matchedLocale = this.matchLocale(browserLocale);
        this.currentLocale = matchedLocale;
      }
    }
  }

  private matchLocale(locale: string): Locale {
    if (SUPPORTED_LOCALES[locale as Locale]) {
      return locale as Locale;
    }

    const baseLocale = locale.split('-')[0] as Locale;
    if (SUPPORTED_LOCALES[baseLocale]) {
      return baseLocale;
    }

    return this.defaultLocale;
  }

  addTranslations(locale: Locale, namespace: string, translations: TranslationMap): void {
    const key = `${locale}:${namespace}`;
    this.translations.set(key, translations);
    this.loadedLocales.add(locale);
  }

  setLocale(locale: Locale): void {
    if (!SUPPORTED_LOCALES[locale]) {
      console.warn(`Locale ${locale} is not supported`);
      return;
    }

    this.currentLocale = locale;

    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', locale);
      document.documentElement.lang = locale;
      
      const direction = SUPPORTED_LOCALES[locale].direction || 'ltr';
      document.documentElement.dir = direction;
    }

    this.notifyListeners();
  }

  getLocale(): Locale {
    return this.currentLocale;
  }

  getConfig(): LocaleConfig {
    return SUPPORTED_LOCALES[this.currentLocale];
  }

  t(
    key: string,
    options?: TranslationOptions,
    namespace?: string
  ): string {
    const translation = this.getTranslation(key, namespace);

    if (typeof translation !== 'string') {
      return key;
    }

    return this.interpolate(translation, options);
  }

  private getTranslation(key: string, namespace?: string): TranslationValue | null {
    const parts = key.split(':');
    const actualNamespace = namespace || parts[0];
    const actualKey = namespace ? key : parts.slice(1).join(':');

    let result = this.translations.get(`${this.currentLocale}:${actualNamespace}`);

    if (!result) {
      result = this.translations.get(`${this.defaultLocale}:${actualNamespace}`);
    }

    if (!result) {
      result = this.translations.get(`${this.fallbackLocale}:${actualNamespace}`);
    }

    if (!result) {
      return null;
    }

    const keys = actualKey.split('.');
    let value: unknown = result;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }

    return value as TranslationValue;
  }

  private interpolate(text: string, options?: TranslationOptions): string {
    if (!options) return text;

    return text.replace(/\{\{(\w+)(?::(\w+))?\}\}/g, (match, key, format) => {
      if (key in options) {
        let value = options[key];

        if (format === 'uppercase') {
          value = String(value).toUpperCase();
        } else if (format === 'lowercase') {
          value = String(value).toLowerCase();
        } else if (format === 'capitalize') {
          value = String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase();
        } else if (format === 'plural') {
          value = this.getPlural(value as number, options);
        } else if (format === 'gender') {
          value = this.getGender(value as 'male' | 'female' | 'other');
        } else if (format === 'number') {
          value = this.formatNumber(value as number);
        } else if (format === 'date') {
          value = this.formatDate(value as number | Date);
        }

        return String(value);
      }

      return match;
    });
  }

  private getPlural(count: number, options?: TranslationOptions): string {
    const locale = this.currentLocale;
    
    try {
      const pluralRules = new Intl.PluralRules(locale);
      const rule = pluralRules.select(count);
      
      if (options && 'plural' in options) {
        const pluralMap = options.plural as Record<string, string>;
        return pluralMap[rule] || pluralMap.other || String(count);
      }
      
      return rule;
    } catch {
      return count === 1 ? 'one' : 'other';
    }
  }

  private getGender(gender: 'male' | 'female' | 'other'): string {
    return gender;
  }

  private formatNumber(value: number): string {
    try {
      return new Intl.NumberFormat(this.currentLocale).format(value);
    } catch {
      return String(value);
    }
  }

  private formatDate(value: number | Date): string {
    try {
      const date = typeof value === 'number' ? new Date(value) : value;
      return new Intl.DateTimeFormat(this.currentLocale).format(date);
    } catch {
      return String(value);
    }
  }

  exists(key: string, namespace?: string): boolean {
    return this.getTranslation(key, namespace) !== null;
  }

  getAvailableLocales(): Locale[] {
    return Array.from(this.loadedLocales);
  }

  isRTL(): boolean {
    return this.getConfig().direction === 'rtl';
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  getAllTranslations(namespace: string): TranslationMap | null {
    return this.translations.get(`${this.currentLocale}:${namespace}`) || null;
  }

  async loadTranslations(locale: Locale, namespace: string, loader: () => Promise<TranslationMap>): Promise<void> {
    try {
      const translations = await loader();
      this.addTranslations(locale, namespace, translations);
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:${namespace}`, error);
    }
  }
}

export const i18n = new I18n();

export const translations: Record<string, TranslationMap> = {
  common: {
    'app.name': 'FREE Agent',
    'app.version': 'Version {{version}}',
    'app.description': 'AI-powered desktop coding assistant',
    
    'nav.home': 'Home',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'nav.about': 'About',
    
    'button.save': 'Save',
    'button.cancel': 'Cancel',
    'button.delete': 'Delete',
    'button.edit': 'Edit',
    'button.add': 'Add',
    'button.close': 'Close',
    'button.confirm': 'Confirm',
    'button.retry': 'Retry',
    'button.loading': 'Loading...',
    
    'error.general': 'An error occurred',
    'error.network': 'Network error',
    'error.notFound': 'Not found',
    'error.unauthorized': 'Unauthorized',
    'error.serverError': 'Server error',
    'error.validation': 'Validation error',
    'error.timeout': 'Request timeout',
    
    'status.online': 'Online',
    'status.offline': 'Offline',
    'status.loading': 'Loading...',
    'status.saving': 'Saving...',
    'status.saved': 'Saved',
    
    'confirm.delete': 'Are you sure you want to delete this?',
    'confirm.leave': 'You have unsaved changes. Are you sure you want to leave?',
    
    'placeholder.search': 'Search...',
    'placeholder.select': 'Select...',
    'placeholder.input': 'Please input...',
  },

  settings: {
    'title': 'Settings',
    'general': 'General',
    'appearance': 'Appearance',
    'api': 'API Configuration',
    'shortcuts': 'Keyboard Shortcuts',
    'about': 'About',
    
    'language': 'Language',
    'theme': 'Theme',
    'theme.dark': 'Dark',
    'theme.light': 'Light',
    'theme.system': 'System',
    
    'fontSize': 'Font Size',
    'fontFamily': 'Font Family',
    'codeTheme': 'Code Theme',
    
    'apiProvider': 'API Provider',
    'apiKey': 'API Key',
    'apiBaseUrl': 'Base URL',
    'apiModel': 'Model',
    'apiTemperature': 'Temperature',
    'apiMaxTokens': 'Max Tokens',
    
    'serverPort': 'Server Port',
    'serverHost': 'Server Host',
    
    'llamaEnabled': 'Enable Local Model (llama.cpp)',
    'llamaPath': 'llama.cpp Path',
    'llamaPort': 'llama.cpp Port',
    'llamaContextSize': 'Context Size',
    'llamaGpuLayers': 'GPU Layers',
    
    'save.success': 'Settings saved successfully',
    'save.error': 'Failed to save settings',
    'reset.confirm': 'Are you sure you want to reset all settings?',
  },

  chat: {
    'title': 'Chat',
    'placeholder': 'Type your message...',
    'send': 'Send',
    'clear': 'Clear Chat',
    
    'role.user': 'You',
    'role.assistant': 'Assistant',
    'role.system': 'System',
    
    'streaming.start': 'Generating response...',
    'streaming.end': 'Response complete',
    
    'error.send': 'Failed to send message',
    'error.stream': 'Stream error',
    
    'history.empty': 'No chat history',
    'history.clear': 'Clear all history?',
    
    'suggestion.title': 'Suggestions',
  },

  editor: {
    'title': 'Editor',
    'newFile': 'New File',
    'openFile': 'Open File',
    'saveFile': 'Save File',
    'closeFile': 'Close File',
    
    'untitled': 'Untitled',
    'modified': 'Modified',
    'readonly': 'Read Only',
    
    'line': 'Line',
    'column': 'Column',
    'selection': 'Selection',
    
    'find': 'Find',
    'replace': 'Replace',
    'findNext': 'Find Next',
    'findPrevious': 'Find Previous',
    'replaceAll': 'Replace All',
    
    'gotoLine': 'Go to Line',
    'gotoFile': 'Go to File',
  },

  file: {
    'title': 'Files',
    'explorer': 'File Explorer',
    
    'newFile': 'New File',
    'newFolder': 'New Folder',
    'rename': 'Rename',
    'delete': 'Delete',
    'duplicate': 'Duplicate',
    
    'open': 'Open',
    'openInNewTab': 'Open in New Tab',
    'revealInExplorer': 'Reveal in Explorer',
    
    'error.read': 'Failed to read file',
    'error.write': 'Failed to write file',
    'error.delete': 'Failed to delete file',
    'error.rename': 'Failed to rename file',
    
    'confirm.delete': 'Are you sure you want to delete "{{name}}"?',
    'confirm.overwrite': 'File already exists. Overwrite?',
  },

  tools: {
    'title': 'Tools',
    'terminal': 'Terminal',
    'git': 'Git',
    'debugger': 'Debugger',
    
    'terminal.new': 'New Terminal',
    'terminal.kill': 'Kill Terminal',
    'terminal.clear': 'Clear Terminal',
    
    'git.commit': 'Commit',
    'git.push': 'Push',
    'git.pull': 'Pull',
    'git.branch': 'Branch',
    'git.merge': 'Merge',
    'git.diff': 'Diff',
    'git.log': 'Log',
    
    'git.commitMessage': 'Commit message',
    'git.noChanges': 'No changes to commit',
  },

  plugins: {
    'title': 'Plugins',
    'installed': 'Installed',
    'available': 'Available',
    'search': 'Search plugins...',
    
    'install': 'Install',
    'uninstall': 'Uninstall',
    'enable': 'Enable',
    'disable': 'Disable',
    'update': 'Update',
    
    'settings': 'Plugin Settings',
    'description': 'Description',
    'author': 'Author',
    'version': 'Version',
    'homepage': 'Homepage',
    
    'install.success': 'Plugin installed successfully',
    'install.error': 'Failed to install plugin',
    'uninstall.success': 'Plugin uninstalled successfully',
    'uninstall.confirm': 'Are you sure you want to uninstall this plugin?',
  },

  update: {
    'title': 'Updates',
    'checking': 'Checking for updates...',
    'available': 'Update available',
    'downloading': 'Downloading update...',
    'ready': 'Update ready to install',
    'restart': 'Restart to Update',
    'later': 'Later',
    
    'currentVersion': 'Current Version',
    'latestVersion': 'Latest Version',
    'releaseNotes': 'Release Notes',
    
    'error.check': 'Failed to check for updates',
    'error.download': 'Failed to download update',
  },
};

Object.entries(translations).forEach(([namespace, map]) => {
  i18n.addTranslations('en', namespace, map);
});

i18n.addTranslations('zh-CN', 'common', {
  'app.name': 'FREE Agent',
  'app.version': '版本 {{version}}',
  'app.description': 'AI 驱动的桌面编程助手',
  
  'nav.home': '首页',
  'nav.settings': '设置',
  'nav.help': '帮助',
  'nav.about': '关于',
  
  'button.save': '保存',
  'button.cancel': '取消',
  'button.delete': '删除',
  'button.edit': '编辑',
  'button.add': '添加',
  'button.close': '关闭',
  'button.confirm': '确认',
  'button.retry': '重试',
  'button.loading': '加载中...',
  
  'error.general': '发生错误',
  'error.network': '网络错误',
  'error.notFound': '未找到',
  'error.unauthorized': '未授权',
  'error.serverError': '服务器错误',
  'error.validation': '验证错误',
  'error.timeout': '请求超时',
  
  'status.online': '在线',
  'status.offline': '离线',
  'status.loading': '加载中...',
  'status.saving': '保存中...',
  'status.saved': '已保存',
  
  'confirm.delete': '确定要删除吗？',
  'confirm.leave': '您有未保存的更改，确定要离开吗？',
  
  'placeholder.search': '搜索...',
  'placeholder.select': '请选择...',
  'placeholder.input': '请输入...',
});

i18n.addTranslations('zh-CN', 'settings', {
  'title': '设置',
  'general': '通用',
  'appearance': '外观',
  'api': 'API 配置',
  'shortcuts': '快捷键',
  'about': '关于',
  
  'language': '语言',
  'theme': '主题',
  'theme.dark': '深色',
  'theme.light': '浅色',
  'theme.system': '跟随系统',
  
  'fontSize': '字体大小',
  'fontFamily': '字体',
  'codeTheme': '代码主题',
  
  'apiProvider': 'API 提供商',
  'apiKey': 'API 密钥',
  'apiBaseUrl': '基础 URL',
  'apiModel': '模型',
  'apiTemperature': '温度',
  'apiMaxTokens': '最大令牌数',
  
  'serverPort': '服务器端口',
  'serverHost': '服务器主机',
  
  'llamaEnabled': '启用本地模型 (llama.cpp)',
  'llamaPath': 'llama.cpp 路径',
  'llamaPort': 'llama.cpp 端口',
  'llamaContextSize': '上下文大小',
  'llamaGpuLayers': 'GPU 层数',
  
  'save.success': '设置保存成功',
  'save.error': '设置保存失败',
  'reset.confirm': '确定要重置所有设置吗？',
});

i18n.addTranslations('zh-CN', 'chat', {
  'title': '聊天',
  'placeholder': '输入您的消息...',
  'send': '发送',
  'clear': '清空聊天',
  
  'role.user': '您',
  'role.assistant': '助手',
  'role.system': '系统',
  
  'streaming.start': '正在生成回复...',
  'streaming.end': '回复完成',
  
  'error.send': '发送消息失败',
  'error.stream': '流式错误',
  
  'history.empty': '暂无聊天历史',
  'history.clear': '清空所有历史？',
  
  'suggestion.title': '建议',
});

i18n.addTranslations('ja', 'common', {
  'app.name': 'FREE Agent',
  'app.version': 'バージョン {{version}}',
  'app.description': 'AI搭載デスクトップコーディングアシスタント',
  
  'nav.home': 'ホーム',
  'nav.settings': '設定',
  'nav.help': 'ヘルプ',
  'nav.about': 'について',
  
  'button.save': '保存',
  'button.cancel': 'キャンセル',
  'button.delete': '削除',
  'button.edit': '編集',
  'button.add': '追加',
  'button.close': '閉じる',
  'button.confirm': '確認',
  'button.retry': '再試行',
  'button.loading': '読み込み中...',
  
  'error.general': 'エラーが発生しました',
  'error.network': 'ネットワークエラー',
  'error.notFound': '見つかりません',
  'error.unauthorized': '未認証',
  'error.serverError': 'サーバーエラー',
  'error.validation': '検証エラー',
  'error.timeout': 'リクエストタイムアウト',
  
  'status.online': 'オンライン',
  'status.offline': 'オフライン',
  'status.loading': '読み込み中...',
  'status.saving': '保存中...',
  'status.saved': '保存済み',
  
  'confirm.delete': '本当に削除しますか？',
  'confirm.leave': '未保存の変更があります。本当に離れますか？',
  
  'placeholder.search': '検索...',
  'placeholder.select': '選択...',
  'placeholder.input': '入力してください...',
});

i18n.addTranslations('ja', 'settings', {
  'title': '設定',
  'general': '一般',
  'appearance': '外観',
  'api': 'API設定',
  'shortcuts': 'キーボードショートカット',
  'about': 'について',
  
  'language': '言語',
  'theme': 'テーマ',
  'theme.dark': 'ダーク',
  'theme.light': 'ライト',
  'theme.system': 'システム',
  
  'fontSize': 'フォントサイズ',
  'fontFamily': 'フォント',
  'codeTheme': 'コードテーマ',
  
  'apiProvider': 'APIプロバイダー',
  'apiKey': 'APIキー',
  'apiBaseUrl': 'ベースURL',
  'apiModel': 'モデル',
  'apiTemperature': ' температура',
  'apiMaxTokens': '最大トークン数',
  
  'serverPort': 'サーバーポート',
  'serverHost': 'サーバーアドレス',
  
  'llamaEnabled': 'ローカルモデルを有効化 (llama.cpp)',
  'llamaPath': 'llama.cpp パス',
  'llamaPort': 'llama.cpp ポート',
  'llamaContextSize': 'コンテキストサイズ',
  'llamaGpuLayers': 'GPUレイヤー数',
  
  'save.success': '設定を保存しました',
  'save.error': '設定の保存に失敗しました',
  'reset.confirm': 'すべての設定をリセットしますか？',
});

i18n.addTranslations('ja', 'chat', {
  'title': 'チャット',
  'placeholder': 'メッセージを入力...',
  'send': '送信',
  'clear': 'チャットをクリア',
  
  'role.user': 'あなた',
  'role.assistant': 'アシスタント',
  'role.system': 'システム',
  
  'streaming.start': '応答を生成中...',
  'streaming.end': '応答完了',
  
  'error.send': 'メッセージの送信に失敗しました',
  'error.stream': 'ストリームエラー',
  
  'history.empty': 'チャット履歴がありません',
  'history.clear': 'すべての履歴をクリアしますか？',
  
  'suggestion.title': '提案',
});

i18n.addTranslations('ko', 'common', {
  'app.name': 'FREE Agent',
  'app.version': '버전 {{version}}',
  'app.description': 'AI 기반 데스크톱 코딩 어시스턴트',
  
  'nav.home': '홈',
  'nav.settings': '설정',
  'nav.help': '도움말',
  'nav.about': '정보',
  
  'button.save': '저장',
  'button.cancel': '취소',
  'button.delete': '삭제',
  'button.edit': '편집',
  'button.add': '추가',
  'button.close': '닫기',
  'button.confirm': '확인',
  'button.retry': '다시 시도',
  'button.loading': '로딩 중...',
  
  'error.general': '오류가 발생했습니다',
  'error.network': '네트워크 오류',
  'error.notFound': '찾을 수 없음',
  'error.unauthorized': '인증되지 않음',
  'error.serverError': '서버 오류',
  'error.validation': '유효성 검사 오류',
  'error.timeout': '요청 시간 초과',
  
  'status.online': '온라인',
  'status.offline': '오프라인',
  'status.loading': '로딩 중...',
  'status.saving': '저장 중...',
  'status.saved': '저장됨',
  
  'confirm.delete': '정말 삭제하시겠습니까?',
  'confirm.leave': '저장되지 않은 변경 사항이 있습니다. 정말 나가시겠습니까?',
  
  'placeholder.search': '검색...',
  'placeholder.select': '선택...',
  'placeholder.input': '입력하세요...',
});

i18n.addTranslations('ko', 'settings', {
  'title': '설정',
  'general': '일반',
  'appearance': '외관',
  'api': 'API 설정',
  'shortcuts': '키보드 단축키',
  'about': '정보',
  
  'language': '언어',
  'theme': '테마',
  'theme.dark': '다크',
  'theme.light': '라이트',
  'theme.system': '시스템',
  
  'fontSize': '글꼴 크기',
  'fontFamily': '글꼴',
  'codeTheme': '코드 테마',
  
  'apiProvider': 'API 공급자',
  'apiKey': 'API 키',
  'apiBaseUrl': '기본 URL',
  'apiModel': '모델',
  'apiTemperature': '온도',
  'apiMaxTokens': '최대 토큰 수',
  
  'serverPort': '서버 포트',
  'serverHost': '서버 주소',
  
  'llamaEnabled': '로컬 모델 활성화 (llama.cpp)',
  'llamaPath': 'llama.cpp 경로',
  'llamaPort': 'llama.cpp 포트',
  'llamaContextSize': '컨텍스트 크기',
  'llamaGpuLayers': 'GPU 레이어 수',
  
  'save.success': '설정이 저장되었습니다',
  'save.error': '설정 저장에 실패했습니다',
  'reset.confirm': '모든 설정을 재설정하시겠습니까?',
});

i18n.addTranslations('ko', 'chat', {
  'title': '채팅',
  'placeholder': '메시지를 입력하세요...',
  'send': '전송',
  'clear': '채팅 지우기',
  
  'role.user': '나',
  'role.assistant': '어시스턴트',
  'role.system': '시스템',
  
  'streaming.start': '응답 생성 중...',
  'streaming.end': '응답 완료',
  
  'error.send': '메시지 전송에 실패했습니다',
  'error.stream': '스트림 오류',
  
  'history.empty': '채팅 기록이 없습니다',
  'history.clear': '모든 기록을 지우시겠습니까?',
  
  'suggestion.title': '제안',
});

interface I18nContextValue {
  locale: Locale;
  t: (key: string, options?: TranslationOptions, namespace?: string) => string;
  setLocale: (locale: Locale) => void;
  getConfig: () => LocaleConfig;
  isRTL: boolean;
  availableLocales: Locale[];
}

export const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  t: (key) => key,
  setLocale: () => {},
  getConfig: () => SUPPORTED_LOCALES.en,
  isRTL: false,
  availableLocales: ['en'],
});

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(i18n.getLocale());

  useEffect(() => {
    const unsubscribe = i18n.onChange(() => {
      setLocaleState(i18n.getLocale());
    });
    return unsubscribe;
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    i18n.setLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string, options?: TranslationOptions, namespace?: string) => {
      return i18n.t(key, options, namespace);
    },
    [locale]
  );

  return {
    locale,
    t,
    setLocale,
    getConfig: () => i18n.getConfig(),
    isRTL: i18n.isRTL(),
    availableLocales: i18n.getAvailableLocales(),
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const i18nValue = useI18n();
  
  return (
    <I18nContext.Provider value={i18nValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function withI18n<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function WithI18nComponent(props: P) {
    return (
      <I18nContext.Consumer>
        {(value) => <Component {...props} />}
      </I18nContext.Consumer>
    );
  };
}
