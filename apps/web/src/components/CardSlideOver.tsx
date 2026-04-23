import { Dialog, Transition } from "@headlessui/react";
import type { RouterInputs } from "@kan/api";
import { Fragment } from "react";

import SlideInPanel from "~/components/SlideInPanel";
import { usePermissions } from "~/hooks/usePermissions";
import { ModalProvider } from "~/providers/modal";
import { ChecklistPanelProvider, useChecklistPanel } from "~/providers/checklist-panel";
import CardPage, { CardActivityPanel } from "~/views/card";
import CardChecklistPanel from "~/views/card/components/CardChecklistPanel";

type BoardQueryParams = RouterInputs["board"]["byId"];

interface CardSlideOverProps {
  cardPublicId?: string;
  isTemplate?: boolean;
  isOpen: boolean;
  onClose: () => void;
  mode?: "view" | "add";
  boardPublicId?: string;
  listPublicId?: string;
  queryParams?: BoardQueryParams;
  preSelectedLabelId?: string;
  preSelectedMemberId?: string;
  preSelectedDueDate?: Date;
}

function CardSlideOverContent({
  cardPublicId,
  isTemplate,
  isOpen,
  onClose,
  mode = "view",
  boardPublicId,
  listPublicId,
  queryParams,
  preSelectedLabelId,
  preSelectedMemberId,
  preSelectedDueDate,
}: CardSlideOverProps) {
  const isAddMode = mode === "add";
  const { isOpen: checklistPanelOpen } = useChecklistPanel();
  const { canEditCard } = usePermissions();

  return (
    <>
      {isOpen && (isAddMode || cardPublicId) ? (
        <ModalProvider>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 flex-1 flex flex-col">
              <CardPage
                cardPublicId={cardPublicId}
                isTemplate={isTemplate}
                isSlideOver
                onClose={onClose}
                mode={mode}
                boardPublicId={boardPublicId}
                listPublicId={listPublicId}
                queryParams={queryParams}
                preSelectedLabelId={preSelectedLabelId}
                preSelectedMemberId={preSelectedMemberId}
                preSelectedDueDate={preSelectedDueDate}
              />
            </div>
            {!isAddMode && cardPublicId && (
              <SlideInPanel isVisible={checklistPanelOpen}>
                <CardChecklistPanel
                  cardPublicId={cardPublicId}
                  canEdit={canEditCard}
                />
              </SlideInPanel>
            )}
            {!isAddMode && cardPublicId && (
              <CardActivityPanel
                cardPublicId={cardPublicId}
                isTemplate={isTemplate}
              />
            )}
          </div>
        </ModalProvider>
      ) : null}
    </>
  );
}

export default function CardSlideOver(props: CardSlideOverProps) {
  return (
    <Transition.Root show={props.isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-40"
        onClose={props.onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/10 transition-opacity dark:bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex pl-8">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-200"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-150"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto flex h-full w-full max-w-[1520px] flex-col border-l border-light-300 bg-light-50 shadow-xl dark:border-dark-300 dark:bg-dark-50 dark:shadow-none">
                  <ChecklistPanelProvider>
                    <CardSlideOverContent {...props} />
                  </ChecklistPanelProvider>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
