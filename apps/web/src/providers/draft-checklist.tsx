import { createContext, useContext, useState } from "react";
import type { DraftChecklist } from "~/views/card/components/DraftChecklistPanel";

interface DraftChecklistContextType {
  draftChecklists: DraftChecklist[];
  setDraftChecklists: (checklists: DraftChecklist[]) => void;
}

const DraftChecklistContext = createContext<DraftChecklistContextType>({
  draftChecklists: [],
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setDraftChecklists: () => {},
});

export function DraftChecklistProvider({ children }: { children: React.ReactNode }) {
  const [draftChecklists, setDraftChecklists] = useState<DraftChecklist[]>([]);

  return (
    <DraftChecklistContext.Provider value={{ draftChecklists, setDraftChecklists }}>
      {children}
    </DraftChecklistContext.Provider>
  );
}

export function useDraftChecklist() {
  return useContext(DraftChecklistContext);
}
