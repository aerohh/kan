import { createContext, useContext, useState } from "react";

interface ActivityPanelContextType {
  isOpen: boolean;
  toggle: () => void;
}

const ActivityPanelContext = createContext<ActivityPanelContextType>({
  isOpen: false,
  toggle: () => {
    throw new Error("toggle must be used within ActivityPanelProvider");
  },
});

export function ActivityPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ActivityPanelContext.Provider
      value={{ isOpen, toggle: () => setIsOpen((prev) => !prev) }}
    >
      {children}
    </ActivityPanelContext.Provider>
  );
}

export function useActivityPanel() {
  return useContext(ActivityPanelContext);
}
