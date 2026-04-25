import { createContext, useCallback, useContext, useState } from "react";
import type { DraftChecklist } from "~/views/card/components/DraftChecklistPanel";

type ActiveSidePanel = "none" | "activity" | "doc";

interface CardPanelsContextType {
  checklistPanelOpen: boolean;
  toggleChecklistPanel: () => void;
  openChecklistPanel: () => void;
  activeSidePanel: ActiveSidePanel;
  activityPanelOpen: boolean;
  docPanelOpen: boolean;
  docPublicId: string | null;
  toggleActivityPanel: () => void;
  openDocPanel: (docPublicId: string) => void;
  closeSidePanel: () => void;
  draftChecklists: DraftChecklist[];
  setDraftChecklists: (checklists: DraftChecklist[]) => void;
}

const CardPanelsContext = createContext<CardPanelsContextType | null>(null);

export function CardPanelsProvider({ children }: { children: React.ReactNode }) {
  const [checklistPanelOpen, setChecklistPanelOpen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<ActiveSidePanel>("none");
  const [docPublicId, setDocPublicId] = useState<string | null>(null);
  const [draftChecklists, setDraftChecklists] = useState<DraftChecklist[]>([]);

  const toggleChecklistPanel = useCallback(
    () => setChecklistPanelOpen((prev) => !prev),
    [],
  );

  const openChecklistPanel = useCallback(
    () => setChecklistPanelOpen(true),
    [],
  );

  const toggleActivityPanel = useCallback(() => {
    setActiveSidePanel((prev) => prev === "activity" ? "none" : "activity");
    setDocPublicId(null);
  }, []);

  const openDocPanel = useCallback((id: string) => {
    setActiveSidePanel("doc");
    setDocPublicId(id);
  }, []);

  const closeSidePanel = useCallback(() => {
    setActiveSidePanel("none");
    setDocPublicId(null);
  }, []);

  return (
    <CardPanelsContext.Provider
      value={{
        checklistPanelOpen,
        toggleChecklistPanel,
        openChecklistPanel,
        activeSidePanel,
        activityPanelOpen: activeSidePanel === "activity",
        docPanelOpen: activeSidePanel === "doc",
        docPublicId,
        toggleActivityPanel,
        openDocPanel,
        closeSidePanel,
        draftChecklists,
        setDraftChecklists,
      }}
    >
      {children}
    </CardPanelsContext.Provider>
  );
}

export function useCardPanels() {
  const context = useContext(CardPanelsContext);
  if (!context) {
    throw new Error("useCardPanels must be used within a CardPanelsProvider");
  }
  return context;
}
