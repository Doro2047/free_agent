import { useState, useCallback, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { TaskPanel } from '../panels/TaskPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { ChatToolsPanel } from '../panels/ChatToolsPanel'
import { DevToolsPanel } from '../panels/DevToolsPanel'
import { SettingsPanel } from '../settings/SettingsPanel'
import { ResizablePanel } from './ResizablePanel'
import { useAppStore } from '@/stores/appStore'
import { useConfigStore } from '@/stores/configStore'
import { useChatStore } from '@/stores/chatStore'
import { useTaskStore } from '@/stores/taskStore'
import { Button } from '@/components/ui/Button'
import { Menu, PanelRight, Settings, Sparkles, Code, MessageCircle, Wrench, LayoutList } from 'lucide-react'
import { ServerStatusIndicator } from './ServerStatusIndicator'
import { cn } from '@/utils/cn'

export function MainLayout() {
  const { sidebarCollapsed, rightPanelVisible, toggleSidebar, toggleRightPanel } = useAppStore()
  const agentMode = useConfigStore((s) => s.agentMode)
  const { loadTasks } = useTaskStore()
  const { loadSessions, messages, loadHistory } = useChatStore()
  const [showSettings, setShowSettings] = useState(false)
  const [isAutoStarting, setIsAutoStarting] = useState(true)
  const [chatMaxHeight, setChatMaxHeight] = useState(850)
  const location = useLocation()

  useEffect(() => {
    const updateMaxHeight = () => {
      setChatMaxHeight(Math.round(window.innerHeight * 0.85))
    }
    updateMaxHeight()
    window.addEventListener('resize', updateMaxHeight)
    return () => window.removeEventListener('resize', updateMaxHeight)
  }, [])

  useEffect(() => {
    const autoStart = async () => {
      try {
        await Promise.all([
          loadTasks(),
          loadSessions(),
        ])

        const sessions = useTaskStore.getState().tasks
        if (sessions.length > 0) {
          const activeTask = useTaskStore.getState().activeTaskId
          if (activeTask) {
            await loadHistory(activeTask)
          }
        }
      } catch (error) {
        console.error('自动启动失败:', error)
      } finally {
        setIsAutoStarting(false)
      }
    }
    autoStart()
  }, [loadTasks, loadSessions, loadHistory])

  const handleLeftCollapse = useCallback((_collapsed: boolean) => {
    toggleSidebar()
  }, [toggleSidebar])

  const handleRightCollapse = useCallback((_collapsed: boolean) => {
    toggleRightPanel()
  }, [toggleRightPanel])

  const isChatMode = agentMode === 'chat'
  const isSettingsPage = location.pathname === '/settings'
  const isTasksPage = location.pathname === '/tasks'
  const isDevToolsPage = location.pathname === '/devtools'

  return (
    <div className="flex h-full w-full bg-background">
      {!isSettingsPage && !isDevToolsPage && (
        <ResizablePanel
          defaultSize={256}
          minSize={200}
          maxSize={480}
          collapsible
          collapsed={sidebarCollapsed}
          onCollapseChange={handleLeftCollapse}
          side="left"
          direction="vertical"
          className="border-r border-border/50 bg-card/80 backdrop-blur-sm"
          contentClassName="overflow-hidden"
        >
          <TaskPanel />
        </ResizablePanel>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-border/50 bg-gradient-header/80 backdrop-blur-sm px-3 h-12 shrink-0">
          <div className="flex items-center gap-2">
            {!isSettingsPage && !isDevToolsPage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-7 w-7 hover:scale-105 active:scale-95 transition-transform duration-200 rounded-md"
              >
                <Menu className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            )}

            {isSettingsPage || isDevToolsPage ? (
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                  <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.5} />
                </div>
                <h1 className="text-xs font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent tracking-tight">
                  Free Agent
                </h1>
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                      isChatMode
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => useConfigStore.getState().setAgentMode('chat')}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                      !isChatMode
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => useConfigStore.getState().setAgentMode('code')}
                  >
                    <Code className="h-3.5 w-3.5" />
                    <span>Code</span>
                  </button>
                </div>

                <div className="h-4 w-px bg-border/50" />

                <div className="flex items-center gap-1.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10">
                    <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.5} />
                  </div>
                  <h1 className="text-xs font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent tracking-tight">
                    Free Agent
                  </h1>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isSettingsPage && !isDevToolsPage && (
              <>
                <ServerStatusIndicator />
                <div className="h-4 w-px bg-border/50 mx-0.5" />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleRightPanel}
                  className={cn(
                    'h-7 w-7 rounded-md transition-all duration-200 hover:scale-105 active:scale-95',
                    rightPanelVisible ? 'text-primary bg-primary/10' : ''
                  )}
                >
                  <PanelRight className="h-3.5 w-3.5" strokeWidth={2} />
                </Button>
              </>
            )}

            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                  location.pathname === '/'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Workspace</span>
              </Link>

              <Link
                to="/tasks"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                  isTasksPage
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Tasks</span>
              </Link>

              <Link
                to="/devtools"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200',
                  isDevToolsPage
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Dev Tools</span>
              </Link>
            </nav>

            <div className="h-4 w-px bg-border/50 mx-0.5" />

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className={cn(
                'h-7 w-7 rounded-md hover:scale-105 active:scale-95 hover:rotate-90 transition-all duration-300',
                isSettingsPage ? 'text-primary bg-primary/10' : ''
              )}
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          {isSettingsPage || isTasksPage || isDevToolsPage ? (
            <Outlet />
          ) : (
            <ResizablePanel
              defaultSize={0}
              minSize={200}
              maxSize={chatMaxHeight}
              direction="horizontal"
              className="flex-1 min-h-0 relative"
              contentClassName="flex-1 min-h-0 relative"
            >
              <main className="flex-1 min-h-0 relative">
                {isAutoStarting && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-3 animate-fade-in">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      </div>
                      <div className="text-sm text-muted-foreground">正在初始化...</div>
                      <div className="text-xs text-muted-foreground/50">加载模型和服务</div>
                    </div>
                  </div>
                ) : (
                  <ChatPanel />
                )}
              </main>
            </ResizablePanel>
          )}
        </div>
      </div>

      {!isSettingsPage && !isDevToolsPage && rightPanelVisible && (
        <ResizablePanel
          defaultSize={320}
          minSize={240}
          maxSize={800}
          collapsible
          collapsed={!rightPanelVisible}
          onCollapseChange={handleRightCollapse}
          side="right"
          direction="vertical"
          className="border-l border-border/50 bg-card/80 backdrop-blur-sm"
          contentClassName="overflow-hidden"
        >
          {isChatMode ? <ChatToolsPanel /> : <DevToolsPanel />}
        </ResizablePanel>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
