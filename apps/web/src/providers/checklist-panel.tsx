import { createContext, useContext, useState } from "react";

interface ChecklistPanelContextType {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
}

const ChecklistPanelContext = createContext<ChecklistPanelContextType>({
  isOpen: false,
  toggle: () => {
    throw new Error("toggle must be used within ChecklistPanelProvider");
  },
  open: () => {
    throw new Error("open must be used within ChecklistPanelProvider");
  },
});

export function ChecklistPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ChecklistPanelContext.Provider
      value={{ isOpen, toggle: () => setIsOpen((prev) => !prev), open: () => setIsOpen(true) }}
    >
      {children}
    </ChecklistPanelContext.Provider>
  );
}

export function useChecklistPanel() {
  return useContext(ChecklistPanelContext);
}
