import { useRouter } from "next/router";
import SlideInPanel from "~/components/SlideInPanel";
import { useCardPanels } from "~/providers/card-panels";
import { usePermissions } from "~/hooks/usePermissions";
import { CardActivityPanel } from "~/views/card";
import CardChecklistPanel from "~/views/card/components/CardChecklistPanel";
import DraftChecklistPanel from "~/views/card/components/DraftChecklistPanel";
import DocViewerPanel from "~/views/card/components/DocViewerPanel";

interface PanelOrchestratorProps {
  cardPublicId?: string;
  isTemplate?: boolean;
  mode?: "view" | "add";
}

export default function PanelOrchestrator({
  cardPublicId: cardPublicIdProp,
  isTemplate,
  mode = "view",
}: PanelOrchestratorProps) {
  const router = useRouter();
  const isAddMode = mode === "add";

  const cardPublicIdFromUrl = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;

  const cardPublicId = cardPublicIdProp ?? cardPublicIdFromUrl;

  const {
    checklistPanelOpen,
    draftChecklists,
    setDraftChecklists,
    activityPanelOpen,
    docPanelOpen,
    docPublicId,
    closeSidePanel,
  } = useCardPanels();
  const { canEditCard } = usePermissions();

  return (
    <div className="flex min-h-0">
      {!isAddMode && cardPublicId && cardPublicId.length >= 12 && (
        <SlideInPanel isVisible={checklistPanelOpen}>
          <CardChecklistPanel
            cardPublicId={cardPublicId}
            canEdit={canEditCard}
          />
        </SlideInPanel>
      )}
      {isAddMode && (
        <SlideInPanel isVisible={checklistPanelOpen}>
          <DraftChecklistPanel
            checklists={draftChecklists}
            onChange={setDraftChecklists}
          />
        </SlideInPanel>
      )}
      {!isAddMode && cardPublicId && cardPublicId.length >= 12 && (
        <SlideInPanel isVisible={activityPanelOpen}>
          <CardActivityPanel
            cardPublicId={cardPublicId}
            isTemplate={isTemplate}
          />
        </SlideInPanel>
      )}
      {!isAddMode && cardPublicId && cardPublicId.length >= 12 && (
        <SlideInPanel isVisible={docPanelOpen}>
          <DocViewerPanel
            docPublicId={docPublicId}
            onClose={closeSidePanel}
          />
        </SlideInPanel>
      )}
    </div>
  );
}
