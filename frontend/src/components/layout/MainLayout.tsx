import { Outlet } from 'react-router-dom';

export function MainLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Outlet />
    </div>
  );
}

export default MainLayout;
