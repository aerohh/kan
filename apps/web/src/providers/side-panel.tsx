import { createContext, useCallback, useContext, useState } from "react";

type ActiveSidePanel = "none" | "activity" | "doc";

interface SidePanelContextType {
  activePanel: ActiveSidePanel;
  activityPanelOpen: boolean;
  docPanelOpen: boolean;
  docPublicId: string | null;
  toggleActivityPanel: () => void;
  openDocPanel: (docPublicId: string) => void;
  closePanel: () => void;
}

const SidePanelContext = createContext<SidePanelContextType>({
  activePanel: "none",
  activityPanelOpen: false,
  docPanelOpen: false,
  docPublicId: null,
  toggleActivityPanel: () => {},
  openDocPanel: () => {},
  closePanel: () => {},
});

export function SidePanelProvider({ children }: { children: React.ReactNode }) {
  const [activePanel, setActivePanel] = useState<ActiveSidePanel>("none");
  const [docPublicId, setDocPublicId] = useState<string | null>(null);

  const toggleActivityPanel = useCallback(() => {
    setActivePanel((prev) => prev === "activity" ? "none" : "activity");
    setDocPublicId(null);
  }, []);

  const openDocPanel = useCallback((id: string) => {
    setActivePanel("doc");
    setDocPublicId(id);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel("none");
    setDocPublicId(null);
  }, []);

  return (
    <SidePanelContext.Provider
      value={{
        activePanel,
        activityPanelOpen: activePanel === "activity",
        docPanelOpen: activePanel === "doc",
        docPublicId,
        toggleActivityPanel,
        openDocPanel,
        closePanel,
      }}
    >
      {children}
    </SidePanelContext.Provider>
  );
}

export function useSidePanel() {
  return useContext(SidePanelContext);
}
