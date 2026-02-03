import React, { createContext, useContext, useState, useCallback } from 'react';

interface MobileSidebarContextType {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  closeSidebar: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType>({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  closeSidebar: () => {},
});

export function useMobileSidebar() {
  return useContext(MobileSidebarContext);
}

export function MobileSidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <MobileSidebarContext.Provider value={{ sidebarOpen, setSidebarOpen, closeSidebar }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function MobileSidebarOverlay() {
  const { sidebarOpen, closeSidebar } = useMobileSidebar();

  if (!sidebarOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 md:hidden"
      onClick={closeSidebar}
    />
  );
}
