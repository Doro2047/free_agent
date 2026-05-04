import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { ChatPanel } from '../components/panels/ChatPanel';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { TaskPanel } from '../components/panels/TaskPanel';
import { DevToolsPanel } from '../components/panels/DevToolsPanel';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <ChatPanel />,
      },
      {
        path: 'settings',
        element: <SettingsPanel onClose={() => window.history.back()} />,
      },
      {
        path: 'tasks',
        element: <TaskPanel />,
      },
      {
        path: 'devtools',
        element: <DevToolsPanel />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export { router };
