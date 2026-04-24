import type { NextPageWithLayout } from "~/pages/_app";
import { useRouter } from "next/router";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import SlideInPanel from "~/components/SlideInPanel";
import CardView, { CardActivityPanel } from "~/views/card";
import CardChecklistPanel from "~/views/card/components/CardChecklistPanel";
import { ChecklistPanelProvider, useChecklistPanel } from "~/providers/checklist-panel";
import { ActivityPanelProvider, useActivityPanel } from "~/providers/activity-panel";
import { usePermissions } from "~/hooks/usePermissions";

function CardRightPanels({ isTemplate }: { isTemplate?: boolean }) {
  const router = useRouter();
  const cardId = Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId;
  const { isOpen: checklistPanelOpen } = useChecklistPanel();
  const { isOpen: activityPanelOpen } = useActivityPanel();
  const { canEditCard } = usePermissions();

  return (
    <div className="flex min-h-0">
      {cardId && cardId.length >= 12 && (
        <SlideInPanel isVisible={checklistPanelOpen}>
          <CardChecklistPanel
            cardPublicId={cardId}
            canEdit={canEditCard}
          />
        </SlideInPanel>
      )}
      {cardId && cardId.length >= 12 && (
        <SlideInPanel isVisible={activityPanelOpen}>
          <CardActivityPanel isTemplate={isTemplate} />
        </SlideInPanel>
      )}
    </div>
  );
}

const CardPage: NextPageWithLayout = () => {
  return (
    <>
      <CardView />
      <Popup />
    </>
  );
};

CardPage.getLayout = (page) =>
  getDashboardLayout(
    <ChecklistPanelProvider>
      <ActivityPanelProvider>
        {page}
      </ActivityPanelProvider>
    </ChecklistPanelProvider>,
    <CardRightPanels />,
    true,
  );

export default CardPage;
