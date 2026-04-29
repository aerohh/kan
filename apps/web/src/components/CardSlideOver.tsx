import { Dialog, Transition } from "@headlessui/react";
import type { RouterInputs } from "@kan/api";
import { Fragment, useCallback, useRef } from "react";

import { CardPanelsProvider, useCardPanels } from "~/providers/card-panels";
import { ModalProvider } from "~/providers/modal";
import PanelOrchestrator from "~/components/PanelOrchestrator";
import CardPage from "~/views/card";

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
  preSelectedPropertyId?: string;
  registerBeforeClose?: (handler: BeforeCloseHandler) => void;
}

type BeforeCloseHandler = (() => Promise<void>) | null;

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
  preSelectedPropertyId,
  registerBeforeClose,
}: CardSlideOverProps) {
  const isAddMode = mode === "add";
  const { openDocPanel } = useCardPanels();

  return (
    <>
      {isOpen && (isAddMode || cardPublicId) ? (
        <ModalProvider>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-[612px] shrink-0 min-w-0 overflow-hidden">
              <CardPage
                cardPublicId={cardPublicId}
                isTemplate={isTemplate}
                isSlideOver
                onClose={onClose}
                registerBeforeClose={registerBeforeClose}
                mode={mode}
                boardPublicId={boardPublicId}
                listPublicId={listPublicId}
                queryParams={queryParams}
                preSelectedLabelId={preSelectedLabelId}
                preSelectedMemberId={preSelectedMemberId}
                preSelectedDueDate={preSelectedDueDate}
                preSelectedPropertyId={preSelectedPropertyId}
                onViewDoc={openDocPanel}
              />
            </div>
            <PanelOrchestrator
              cardPublicId={cardPublicId}
              isTemplate={isTemplate}
              mode={mode}
            />
          </div>
        </ModalProvider>
      ) : null}
    </>
  );
}

export default function CardSlideOver(props: CardSlideOverProps) {
  const beforeCloseHandlerRef = useRef<BeforeCloseHandler>(null);
  const isClosingRef = useRef(false);

  const registerBeforeClose = useCallback((handler: BeforeCloseHandler) => {
    beforeCloseHandlerRef.current = handler;
  }, []);

  const handleClose = useCallback(async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      await beforeCloseHandlerRef.current?.();
    } catch {}
    props.onClose();
    isClosingRef.current = false;
  }, [props.onClose]);

  return (
    <Transition.Root show={props.isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-40"
        onClose={handleClose}
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
                  <CardPanelsProvider>
                    <CardSlideOverContent {...props} onClose={handleClose} registerBeforeClose={registerBeforeClose} />
                  </CardPanelsProvider>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
