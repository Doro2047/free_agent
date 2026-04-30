import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';

export interface SearchResult {
  id: string;
  type: 'message' | 'conversation' | 'file' | 'agent';
  title: string;
  excerpt: string;
  highlight?: string;
  timestamp?: number;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  type?: SearchResult['type'][];
  dateRange?: {
    start: Date;
    end: Date;
  };
  agents?: string[];
  hasAttachments?: boolean;
}

export interface SearchOptions {
  fuzzy?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxResults?: number;
  highlightMatches?: boolean;
}

export interface SearchContextValue {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: (key: keyof SearchFilters, value: unknown) => void;
  clearFilters: () => void;
  search: (query: string, options?: SearchOptions) => Promise<SearchResult[]>;
  options: SearchOptions;
  setOptions: (options: SearchOptions) => void;
  recentSearches: string[];
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  searchHistory: SearchResult[];
  clearSearchHistory: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch() {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}

const RECENT_SEARCHES_KEY = 'free-agent-recent-searches';
const MAX_RECENT_SEARCHES = 10;

export interface SearchProviderProps {
  children: ReactNode;
  storageKey?: string;
  defaultOptions?: SearchOptions;
  onSearch?: (query: string, results: SearchResult[]) => void;
}

export function SearchProvider({
  children,
  storageKey = RECENT_SEARCHES_KEY,
  defaultOptions = { fuzzy: true, highlightMatches: true, maxResults: 50 },
  onSearch,
}: SearchProviderProps) {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [options, setOptionsState] = useState<SearchOptions>(defaultOptions);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (newQuery.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        search(newQuery);
      }, 300);
    } else {
      setResults([]);
    }
  }, []);

  const search = useCallback(async (
    searchQuery: string,
    searchOptions?: SearchOptions
  ): Promise<SearchResult[]> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsSearching(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const mergedOptions = { ...options, ...searchOptions };
      let searchResults: SearchResult[] = [];
      
      const mockResults: SearchResult[] = [
        {
          id: 'msg-1',
          type: 'message',
          title: 'User message',
          excerpt: 'How to implement a neural network?',
          highlight: searchQuery,
          timestamp: Date.now() - 3600000,
          score: 1.0,
        },
        {
          id: 'msg-2',
          type: 'message',
          title: 'Assistant response',
          excerpt: 'To implement a neural network, you need to...',
          highlight: searchQuery,
          timestamp: Date.now() - 3500000,
          score: 0.95,
        },
        {
          id: 'conv-1',
          type: 'conversation',
          title: 'AI Development Discussion',
          excerpt: 'Discussion about machine learning models...',
          timestamp: Date.now() - 86400000,
          score: 0.9,
        },
      ];
      
      searchResults = mockResults.filter(result => {
        if (filters.type && filters.type.length > 0 && !filters.type.includes(result.type)) {
          return false;
        }
        
        if (filters.dateRange) {
          if (result.timestamp) {
            const date = new Date(result.timestamp);
            if (date < filters.dateRange.start || date > filters.dateRange.end) {
              return false;
            }
          }
        }
        
        return true;
      });
      
      if (mergedOptions.maxResults) {
        searchResults = searchResults.slice(0, mergedOptions.maxResults);
      }
      
      if (mergedOptions.highlightMatches && searchQuery) {
        searchResults = searchResults.map(result => ({
          ...result,
          highlight: highlightText(result.excerpt, searchQuery),
        }));
      }
      
      setResults(searchResults);
      setSearchHistory(prev => [searchResults[0], ...prev].slice(0, 100));
      
      onSearch?.(searchQuery, searchResults);
      
      return searchResults;
    } finally {
      setIsSearching(false);
    }
  }, [options, filters, onSearch]);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    if (query) {
      search(query);
    }
  }, [query, search]);

  const updateFilter = useCallback((key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (query) {
      search(query);
    }
  }, [query, search]);

  const clearFilters = useCallback(() => {
    setFilters({});
    if (query) {
      search(query);
    }
  }, [query, search]);

  const setOptions = useCallback((newOptions: SearchOptions) => {
    setOptionsState(newOptions);
  }, []);

  const addRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      
      return updated;
    });
  }, [storageKey]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const value = useMemo(() => ({
    query,
    setQuery,
    results,
    isSearching,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    options,
    setOptions,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    searchHistory,
    clearSearchHistory,
  }), [
    query,
    setQuery,
    results,
    isSearching,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    options,
    setOptions,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    searchHistory,
    clearSearchHistory,
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

function highlightText(text: string, query: string): string {
  if (!query || !text) return text;
  
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  showFilters?: boolean;
  showRecent?: boolean;
  autoFocus?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchBar({
  placeholder = 'Search...',
  onSearch,
  showFilters = true,
  showRecent = true,
  autoFocus = false,
  size = 'md',
}: SearchBarProps) {
  const {
    query,
    setQuery,
    isSearching,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    filters,
    setFilters,
  } = useSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);

  const sizeStyles = {
    sm: { height: '32px', fontSize: '13px', padding: '0 12px' },
    md: { height: '40px', fontSize: '14px', padding: '0 16px' },
    lg: { height: '48px', fontSize: '16px', padding: '0 20px' },
  };

  const styles = sizeStyles[size];

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      addRecentSearch(query);
      onSearch?.(query);
      setShowRecentDropdown(false);
    }
  }, [query, addRecentSearch, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowRecentDropdown(false);
      inputRef.current?.blur();
    }
  }, [handleSearch]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          padding: `0 ${styles.padding}`,
          height: styles.height,
          transition: 'all 150ms',
          borderColor: isFocused ? 'var(--border-focus)' : 'var(--border-default)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: 'var(--text-secondary)', flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (showRecent && recentSearches.length > 0) {
              setShowRecentDropdown(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: styles.fontSize,
            color: 'var(--text-primary)',
          }}
        />
        
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        
        {isSearching && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              color: 'var(--text-secondary)',
              animation: 'spin 1s linear infinite',
              flexShrink: 0,
            }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
      </div>
      
      {showRecentDropdown && showRecent && recentSearches.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Recent Searches
            </span>
            <button
              onClick={clearRecentSearches}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--brand-500)',
              }}
            >
              Clear
            </button>
          </div>
          {recentSearches.slice(0, 5).map((search, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(search);
                setShowRecentDropdown(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: 'var(--text-primary)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {search}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface SearchResultsListProps {
  renderResult?: (result: SearchResult, index: number) => ReactNode;
}

export function SearchResultsList({ renderResult }: SearchResultsListProps) {
  const { results, query, isSearching } = useSearch();

  if (isSearching) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Searching...
      </div>
    );
  }

  if (!query) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Enter a search query to find messages, conversations, and more.
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No results found for "{query}"
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {results.map((result, index) => (
        <div
          key={result.id}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {renderResult ? (
            renderResult(result, index)
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    color: 'var(--brand-500)',
                    backgroundColor: 'var(--brand-50)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {result.type}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>{result.title}</span>
              </div>
              <div
                style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
                dangerouslySetInnerHTML={{
                  __html: result.highlight || result.excerpt,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export const Search = {
  Provider: SearchProvider,
  SearchBar,
  SearchResultsList,
};

export default SearchProvider;
