import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { HiPlus } from "react-icons/hi2";

import { generateUID } from "@kan/shared/utils";

import Button from "~/components/Button";
import Modal from "~/components/modal";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";
import Checklists from "./Checklists";
import { DeleteChecklistConfirmation } from "./DeleteChecklistConfirmation";
import { NewChecklistForm } from "./NewChecklistForm";

interface CardChecklistPanelProps {
  cardPublicId: string;
  canEdit: boolean;
}

export default function CardChecklistPanel({
  cardPublicId,
  canEdit,
}: CardChecklistPanelProps) {
  const {
    modalContentType,
    entityId,
    getModalState,
    clearModalState,
    isOpen,
  } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(
    null,
  );

  const { data: card } = api.card.byId.useQuery(
    { cardPublicId },
    { enabled: !!cardPublicId && cardPublicId.length >= 12 },
  );

  const checklists = card?.checklists ?? [];

  useEffect(() => {
    if (!card) return;
    const state = getModalState("ADD_CHECKLIST");
    const createdId: string | undefined = state?.createdChecklistId;
    if (createdId) {
      setActiveChecklistForm(createdId);
      clearModalState("ADD_CHECKLIST");
    }
  }, [card, getModalState, clearModalState]);

  const createChecklist = api.checklist.create.useMutation({
    onMutate: async (args) => {
      await utils.card.byId.cancel({ cardPublicId: args.cardPublicId });
      const previous = utils.card.byId.getData({
        cardPublicId: args.cardPublicId,
      });
      utils.card.byId.setData({ cardPublicId: args.cardPublicId }, (old) => {
        if (!old) return old as any;
        const placeholderChecklist = {
          publicId: `PLACEHOLDER_${generateUID()}`,
          name: args.name,
          index: old.checklists.length,
          items: [] as {
            publicId: string;
            title: string;
            completed: boolean;
            index: number;
          }[],
        };
        return {
          ...old,
          checklists: [...old.checklists, placeholderChecklist],
        } as typeof old;
      });
      return { previous };
    },
    onSuccess: (data) => {
      setActiveChecklistForm(data.publicId);
    },
    onError: (_error, vars, ctx) => {
      if (ctx?.previous)
        utils.card.byId.setData(
          { cardPublicId: vars.cardPublicId },
          ctx.previous,
        );
      showPopup({
        header: t`Unable to create checklist`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async (_data, _error, vars) => {
      await invalidateCard(utils, vars.cardPublicId);
    },
  });

  return (
    <>
      <div className="h-full min-h-0 w-[360px] overflow-y-auto border-l-[1px] border-light-300 bg-light-100 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900">
        <div className="pt-[18px]">
          <div className="flex items-center justify-between pb-4">
            <h2 className="pb-4 text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
              {t`Checklists`}
            </h2>
            {canEdit && checklists.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                iconLeft={<HiPlus className="h-4 w-4" />}
                onClick={() =>
                  createChecklist.mutate({
                    name: `Checklist ${checklists.length + 1}`,
                    cardPublicId,
                  })
                }
              />
            )}
          </div>
          {canEdit && checklists.length === 0 && (
            <div className="flex justify-center py-8">
              <button
                type="button"
                onClick={() =>
                  createChecklist.mutate({
                    name: `Checklist 1`,
                    cardPublicId,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-light-200 px-3 py-2 text-sm font-medium text-light-900 hover:bg-light-300 dark:bg-dark-200 dark:text-dark-900 dark:hover:bg-dark-300"
              >
                <HiPlus className="h-4 w-4" />
                {t`Add Checklist`}
              </button>
            </div>
          )}
          <Checklists
            checklists={checklists}
            cardPublicId={cardPublicId}
            activeChecklistForm={activeChecklistForm}
            setActiveChecklistForm={setActiveChecklistForm}
            viewOnly={!canEdit}
            hideLineProgress
          />
        </div>
      </div>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "ADD_CHECKLIST"}
      >
        <NewChecklistForm cardPublicId={cardPublicId} />
      </Modal>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_CHECKLIST"}
      >
        <DeleteChecklistConfirmation
          cardPublicId={cardPublicId}
          checklistPublicId={entityId}
        />
      </Modal>
    </>
  );
}
