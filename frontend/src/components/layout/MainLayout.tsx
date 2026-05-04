import { Outlet } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { ChatPanel } from '@/components/panels/ChatPanel';
import { TaskPanel } from '@/components/panels/TaskPanel';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { useFileStore } from '@/stores/fileStore';
import { useState } from 'react';

export function MainLayout() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const rightPanelVisible = useAppStore((s) => s.rightPanelVisible);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleRightPanel = useAppStore((s) => s.toggleRightPanel);
  const { activeFilePath } = useFileStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside
        className={`flex-shrink-0 border-r border-border transition-all duration-300 ${
          sidebarCollapsed ? 'w-12' : 'w-64'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/50 px-3 py-3">
            {!sidebarCollapsed && (
              <span className="text-sm font-semibold text-foreground/80">CodeCraft</span>
            )}
            <button
              onClick={toggleSidebar}
              className="rounded-md p-1.5 text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground/80 transition-colors"
              aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg
                className={`h-4 w-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              <TaskPanel />
            </div>
          )}
        </div>
      </aside>

      <main className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <ChatPanel />
      </main>

      {activeFilePath && (
        <aside
          className={`flex-shrink-0 border-l border-border transition-all duration-300 ${
            rightPanelVisible ? 'w-[600px]' : 'w-0'
          }`}
        >
          <div className="h-full w-full">
            <CodeEditor />
          </div>
        </aside>
      )}

      {activeFilePath && !rightPanelVisible && (
        <button
          onClick={toggleRightPanel}
          className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-lg bg-muted/80 px-1 py-3 text-muted-foreground/60 hover:bg-muted hover:text-foreground/80 transition-all backdrop-blur-sm border border-border/50 border-r-0"
          aria-label="展开代码编辑器"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default MainLayout;
