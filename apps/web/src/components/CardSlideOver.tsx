import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

import { ModalProvider } from "~/providers/modal";
import CardPage, { CardActivityPanel } from "~/views/card";

interface CardSlideOverProps {
  cardPublicId: string;
  isTemplate?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export default function CardSlideOver({
  cardPublicId,
  isTemplate,
  isOpen,
  onClose,
}: CardSlideOverProps) {
  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-40"
        onClose={onClose}
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
          <div className="fixed inset-0 bg-black/20 transition-opacity dark:bg-black/40" />
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
                <Dialog.Panel className="pointer-events-auto flex h-full w-full max-w-[1160px] flex-col border-l border-light-300 bg-light-50 shadow-2xl dark:border-dark-300 dark:bg-dark-50">
                  {isOpen && cardPublicId ? (
                    <ModalProvider>
                      <div className="flex min-h-0 flex-1 overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-y-auto">
                          <CardPage
                            cardPublicId={cardPublicId}
                            isTemplate={isTemplate}
                            isSlideOver
                            onClose={onClose}
                          />
                        </div>
                        <CardActivityPanel
                          cardPublicId={cardPublicId}
                          isTemplate={isTemplate}
                        />
                      </div>
                    </ModalProvider>
                  ) : null}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}