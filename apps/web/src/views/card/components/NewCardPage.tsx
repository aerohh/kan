import { t } from "@lingui/core/macro";
import type { RouterInputs } from "@kan/api";
import { generateUID } from "@kan/shared/utils";

import type { WorkspaceMember } from "~/components/Editor";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import DateSelector from "~/components/DateSelector";
import DocEditorForCard, { type DocEditorForCardHandle } from "~/views/docs/components/DocEditorForCard";
import { type MentionMember } from "~/components/MentionSpec";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import Toggle from "~/components/Toggle";
import { useChecklistPanel } from "~/providers/checklist-panel";
import { useDraftChecklist } from "~/providers/draft-checklist";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../../components/DeleteLabelConfirmation";
import {
  HiCheckBadge,
  HiXMark,
} from "react-icons/hi2";
import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

type BoardQueryParams = RouterInputs["board"]["byId"];

type NewCardFormValues = {
  title: string;
  description: string;
  listPublicId: string;
  labelPublicIds: string[];
  memberPublicIds: string[];
  dueDate: Date | null;
  isCreateAnotherEnabled: boolean;
};

interface NewCardPageProps {
  isTemplate?: boolean;
  onClose?: () => void;
  boardPublicId?: string;
  listPublicId?: string;
  queryParams?: BoardQueryParams;
  preSelectedLabelId?: string;
  preSelectedMemberId?: string;
  preSelectedDueDate?: Date;
}

export default function NewCardPage({
  isTemplate,
  onClose,
  boardPublicId: boardPublicIdProp,
  listPublicId: defaultListPublicId,
  queryParams,
  preSelectedLabelId,
  preSelectedMemberId,
  preSelectedDueDate,
}: NewCardPageProps) {
  const editorRef = useRef<DocEditorForCardHandle>(null);
  const utils = api.useUtils();
  const {
    modalContentType,
    entityId,
    clearModalState,
    isOpen,
    modalStates,
    openModal,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();

  const { data: addBoardData } = api.board.byId.useQuery(
    queryParams as BoardQueryParams,
    { enabled: !!queryParams?.boardPublicId },
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<NewCardFormValues>({
    values: {
      title: "",
      description: "",
      listPublicId: defaultListPublicId ?? "",
      labelPublicIds: preSelectedLabelId ? [preSelectedLabelId] : [],
      memberPublicIds: preSelectedMemberId ? [preSelectedMemberId] : [],
      isCreateAnotherEnabled: false,
      dueDate: preSelectedDueDate ?? null,
    },
  });

  const title = watch("title");
  const description = watch("description");
  const labelPublicIds = watch("labelPublicIds") || [];
  const memberPublicIds = watch("memberPublicIds") || [];
  const isCreateAnother = watch("isCreateAnotherEnabled");
  const dueDate = watch("dueDate");
  const listPublicId = watch("listPublicId");
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const { isOpen: checklistPanelOpen, toggle: toggleChecklistPanel } = useChecklistPanel();
  const { draftChecklists, setDraftChecklists } = useDraftChecklist();

  const createCard = api.card.create.useMutation({
    onMutate: async (args) => {
      if (!queryParams) return {};
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = oldBoard.lists.map((list) => {
          if (list.publicId === args.listPublicId) {
            const newCard = {
              publicId: `PLACEHOLDER_${generateUID()}`,
              title: args.title,
              listId: 2,
              description: "",
              dueDate: args.dueDate ?? null,
              labels: oldBoard.labels.filter((label) =>
                args.labelPublicIds.includes(label.publicId),
              ),
              members:
                oldBoard.workspace.members
                  .filter((member) =>
                    args.memberPublicIds.includes(member.publicId),
                  )
                  .map((member) => ({
                    ...member,
                    deletedAt: null,
                  })) ?? [],
              comments: [],
              checklists: [],
              attachments: [],
              docs: [],
              _filteredLabels: labelPublicIds.map((id) => ({ publicId: id })),
              _filteredMembers: memberPublicIds.map((id) => ({ publicId: id })),
              index: 0,
            };

            return { ...list, cards: [newCard, ...list.cards] };
          }
          return list;
        });

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState };
    },
    onError: (err, _args, context) => {
      if (queryParams) {
        utils.board.byId.setData(queryParams, context?.previousState);
      }
      showPopup({
        header: t`Unable to create card`,
        message: err.data?.zodError?.fieldErrors.title?.[0]
          ? `${err.data.zodError.fieldErrors.title[0].replace("String", "Title")}`
          : t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSuccess: async (data) => {
      if (draftChecklists.length > 0 && data.publicId) {
        try {
          for (const draft of draftChecklists) {
            const checklistResult = await utils.client.checklist.create.mutate({
              cardPublicId: data.publicId,
              name: draft.name,
            });
            for (const item of draft.items) {
              await utils.client.checklist.createItem.mutate({
                checklistPublicId: checklistResult.publicId,
                title: item.title,
              });
            }
          }
        } catch {
          showPopup({
            header: t`Checklists not created`,
            message: t`The card was created, but checklists could not be added. You can add them manually.`,
            icon: "error",
          });
        }
      }

      if (!isCreateAnother) {
        onClose?.();
      } else {
        const newFormState = {
          title: "",
          description: "",
          listPublicId,
          labelPublicIds: [] as string[],
          memberPublicIds: [] as string[],
          isCreateAnotherEnabled: true,
          dueDate: null as Date | null,
        };
        reset(newFormState);
        setDraftChecklists([]);
      }
      if (queryParams) {
        await utils.board.byId.invalidate(queryParams);
      }
    },
  });

  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId !== undefined && !labelPublicIds.includes(newLabelId)) {
      setValue("labelPublicIds", [...labelPublicIds, newLabelId]);
    }
  }, [modalStates, labelPublicIds]);

  useEffect(() => {
    if (!addBoardData?.labels) return;
    const availableLabelIds = addBoardData.labels.map((label) => label.publicId);
    const newLabelId = modalStates.NEW_LABEL_CREATED;

    if (newLabelId && availableLabelIds.includes(newLabelId)) {
      clearModalState("NEW_LABEL_CREATED");
    }

    const validLabelIds = labelPublicIds.filter(
      (id) => availableLabelIds.includes(id) || id === newLabelId,
    );

    if (validLabelIds.length !== labelPublicIds.length) {
      setValue("labelPublicIds", validLabelIds);
    }
  }, [addBoardData?.labels, labelPublicIds, modalStates.NEW_LABEL_CREATED]);

  useEffect(() => {
    const titleElement = document.getElementById("title") as HTMLTextAreaElement;
    if (titleElement) titleElement.focus();
  }, []);

  const formattedLabels =
    addBoardData?.labels.map((label) => ({
      key: label.publicId,
      value: label.name,
      leftIcon: <LabelIcon colourCode={label.colourCode} />,
      selected: labelPublicIds.includes(label.publicId),
    })) ?? [];

  const formattedLists =
    addBoardData?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === listPublicId,
    })) ?? [];

  const formattedMembers =
    addBoardData?.workspace.members.map((member) => ({
      key: member.publicId,
      value: formatMemberDisplayName(
        member.user?.name ?? null,
        member.user?.email ?? member.email,
      ),
      selected: memberPublicIds.includes(member.publicId),
      leftIcon: (
        <Avatar
          size="xs"
          name={member.user?.name ?? ""}
          imageUrl={
            member.user?.image ? getAvatarUrl(member.user.image) : undefined
          }
          email={member.user?.email ?? member.email}
        />
      ),
    })) ?? [];

  const editorWorkspaceMembers =
    addBoardData?.workspace.members
      .filter((member) => member.email)
      .map((member): WorkspaceMember => ({
        publicId: member.publicId,
        email: member.email,
        user: member.user
          ? {
              id: member.publicId,
              name: member.user.name,
              image: member.user.image ?? null,
            }
          : null,
      })) ?? [];

  const mentionMembers: MentionMember[] = useMemo(
    () =>
      editorWorkspaceMembers.map((m) => ({
        id: m.publicId,
        label: m.user?.name?.trim() || m.email || "",
        image: m.user?.image ?? null,
      })),
    [editorWorkspaceMembers],
  );

  const onSubmit = (data: NewCardFormValues) => {
    createCard.mutate({
      title: data.title,
      description: data.description,
      listPublicId: data.listPublicId,
      labelPublicIds: data.labelPublicIds,
      memberPublicIds: data.memberPublicIds,
      position: "start",
      dueDate: data.dueDate ?? null,
    });
  };

  const handleSelectList = (pubId: string): void => {
    setValue("listPublicId", pubId);
  };

  const handleSelectMembers = (pubId: string): void => {
    const idx = memberPublicIds.indexOf(pubId);
    if (idx === -1) {
      setValue("memberPublicIds", [...memberPublicIds, pubId]);
    } else {
      const newIds = [...memberPublicIds];
      newIds.splice(idx, 1);
      setValue("memberPublicIds", newIds);
    }
  };

  const handleSelectLabels = (pubId: string): void => {
    const idx = labelPublicIds.indexOf(pubId);
    if (idx === -1) {
      setValue("labelPublicIds", [...labelPublicIds, pubId]);
    } else {
      const newIds = [...labelPublicIds];
      newIds.splice(idx, 1);
      setValue("labelPublicIds", newIds);
    }
  };

  const selectedList = formattedLists.find((item) => item.selected);
  const boardId = boardPublicIdProp ?? addBoardData?.publicId;
  const refetchBoard = async () => {
    if (queryParams) await utils.board.byId.invalidate(queryParams);
  };

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.closest("button")) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (target.tagName === "SELECT") return;
      if (target.closest("[role=\"listbox\"]") || target.closest("[role=\"option\"]")) return;
      if (target.closest(".bn-editor")) return;
      editorRef.current?.focus();
    },
    [],
  );

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="flex w-full items-center justify-end px-4 py-2">
            {onClose && (
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                aria-label={t`Close`}
              >
                <HiXMark className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1 w-full overflow-y-auto" onClick={handleContentClick}>
            <div className="mx-auto flex h-full w-[540px] flex-col">
            <div className="p-6 md:p-8">
              <div className="mb-8 md:mt-4">
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="w-full space-y-6"
                >
                  <div>
                    <textarea
                      id="title"
                      {...register("title")}
                      placeholder={t`New Card`}
                      rows={1}
                      className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 py-0 font-bold leading-relaxed text-neutral-900 placeholder:text-light-800 focus:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-800 sm:text-[1.2rem]"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          await handleSubmit(onSubmit)();
                        }
                      }}
                    />
                  </div>
                </form>
              </div>

              <div className="mb-0 flex flex-wrap items-center gap-2">
                <div className="w-fit">
                  <CheckboxDropdown
                    items={formattedLists}
                    handleSelect={(_groupKey, item) => handleSelectList(item.key)}
                  >
                    <span className="inline-flex h-6 cursor-pointer items-center rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400">
                      {selectedList?.value ?? t`List`}
                    </span>
                  </CheckboxDropdown>
                </div>
                <div className="w-fit">
                  <CheckboxDropdown
                    items={formattedLabels}
                    handleSelect={(_groupKey, item) => handleSelectLabels(item.key)}
                    handleEdit={(labelPubId) =>
                      openModal("EDIT_LABEL", labelPubId)
                    }
                    handleCreate={() => openModal("NEW_LABEL")}
                    createNewItemLabel={t`Create new label`}
                  >
                    {labelPublicIds.length > 0 ? (
                      <div className="flex h-auto flex-wrap items-center gap-1">
                        {labelPublicIds.map((labelPubId) => {
                          const label = addBoardData?.labels.find(
                            (l) => l.publicId === labelPubId,
                          );
                          return (
                            <span
                              key={labelPubId}
                              className="inline-flex h-6 max-w-[120px] items-center truncate rounded-full border-2 px-2 text-[10px] font-medium leading-none text-neutral-600 dark:text-dark-1000"
                              style={{
                                backgroundColor: `${label?.colourCode}25`,
                                borderColor: `${label?.colourCode}30`,
                              }}
                            >
                              {label?.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="inline-flex h-6 cursor-pointer items-center rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400">
                        {t`Labels`}
                      </span>
                    )}
                  </CheckboxDropdown>
                </div>
                {!isTemplate && (
                  <div className="w-fit">
                    <CheckboxDropdown
                      items={formattedMembers}
                      handleSelect={(_groupKey, item) =>
                        handleSelectMembers(item.key)
                      }
                    >
                      {memberPublicIds.length > 0 ? (
                        <div className="flex h-auto flex-wrap items-center gap-0.5 overflow-hidden">
                          <div className="isolate flex flex-wrap -space-x-1.5 overflow-hidden">
                            {memberPublicIds.map((memberPubId) => {
                              const member = formattedMembers.find(
                                (m) => m.key === memberPubId,
                              );
                              return (
                                <Avatar
                                  key={memberPubId}
                                  size="xs"
                                  name={member?.value ?? ""}
                                  imageUrl={undefined}
                                  email={member?.value ?? ""}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex h-6 cursor-pointer items-center rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400">
                          {t`Members`}
                        </span>
                      )}
                    </CheckboxDropdown>
                  </div>
                )}
                <div className="relative w-fit">
                  <button
                    type="button"
                    onClick={() => setIsDateSelectorOpen(!isDateSelectorOpen)}
                    className="inline-flex h-6 cursor-pointer items-center rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400"
                  >
                    {dueDate ? (
                      <span>{format(dueDate, "MMM d, yyyy")}</span>
                    ) : (
                      <span>{t`Due date`}</span>
                    )}
                  </button>
                  {isDateSelectorOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsDateSelectorOpen(false)}
                      />
                      <div
                        className="absolute left-0 top-full z-20 mt-2 rounded-md border border-light-200 bg-light-50 shadow-lg dark:border-dark-200 dark:bg-dark-100"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <DateSelector
                          selectedDate={dueDate ?? undefined}
                          onDateSelect={(date) => {
                            setValue("dueDate", date ?? null);
                            setIsDateSelectorOpen(false);
                          }}
                          weekStartsOn={workspace.weekStartDay}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="my-6 h-[1px] bg-light-500 dark:bg-dark-500" />

              <div className="mb-0 flex w-full flex-col justify-between">
                <div className="mt-2 min-h-[200px]">
                  <DocEditorForCard
                    ref={editorRef}
                    initialContent={description}
                    onChange={(value) => {
                      setValue("description", value);
                    }}
                    readOnly={false}
                    workspaceMembers={mentionMembers}
                  />
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="flex items-center justify-between border-t border-light-300 bg-light-50 px-6 py-3 dark:border-dark-300 dark:bg-dark-50 md:px-8">
            <button
              type="button"
              onClick={toggleChecklistPanel}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                checklistPanelOpen
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  : "text-light-950 hover:bg-light-300 dark:text-dark-950 dark:hover:bg-dark-200"
              }`}
            >
              <HiCheckBadge className="h-5 w-5" />
              {t`Checklists`}
            </button>
            <div className="flex items-center space-x-4">
              <Toggle
                label={t`Create another`}
                isChecked={isCreateAnother}
                onChange={() =>
                  setValue("isCreateAnotherEnabled", !isCreateAnother)
                }
              />
              <Button
                type="button"
                disabled={title.length === 0 || createCard.isPending}
                onClick={() => handleSubmit(onSubmit)()}
              >
                {t`Create card`}
              </Button>
            </div>
          </div>
        </div>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "NEW_LABEL"}
      >
        <LabelForm boardPublicId={boardId ?? ""} refetch={refetchBoard} />
      </Modal>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "EDIT_LABEL"}
      >
        <LabelForm
          boardPublicId={boardId ?? ""}
          refetch={refetchBoard}
          isEdit
        />
      </Modal>

      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_LABEL"}
      >
        <DeleteLabelConfirmation
          refetch={refetchBoard}
          labelPublicId={entityId}
        />
      </Modal>
    </>
  );
}
