import { t } from "@lingui/core/macro";
import type { RouterInputs } from "@kan/api";
import { generateUID } from "@kan/shared/utils";

import type { WorkspaceMember } from "~/components/Editor";
import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import DateSelector from "~/components/DateSelector";
import DocEditorForCard, { type DocEditorForCardHandle } from "~/views/docs/components/DocEditorForCard";
import { type MentionMember } from "~/components/blocknote-specs";
import LabelIcon from "~/components/LabelIcon";
import Toggle from "~/components/Toggle";
import { useCardPanels } from "~/providers/card-panels";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
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
  memberPublicIds: string[];
  propertyOptionIds: string[];
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
  preSelectedPropertyId?: string;
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
  preSelectedPropertyId,
}: NewCardPageProps) {
  const editorRef = useRef<DocEditorForCardHandle>(null);
  const utils = api.useUtils();
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
      memberPublicIds: preSelectedMemberId ? [preSelectedMemberId] : [],
      propertyOptionIds: preSelectedPropertyId ? [preSelectedPropertyId] : [],
      isCreateAnotherEnabled: false,
      dueDate: preSelectedDueDate ?? null,
    },
  });

  const title = watch("title");
  const description = watch("description");
  const memberPublicIds = watch("memberPublicIds") || [];
  const isCreateAnother = watch("isCreateAnotherEnabled");
  const dueDate = watch("dueDate");
  const listPublicId = watch("listPublicId");
  const propertyOptionIds = watch("propertyOptionIds") || [];
  const [isDateSelectorOpen, setIsDateSelectorOpen] = useState(false);
  const { checklistPanelOpen, toggleChecklistPanel, draftChecklists, setDraftChecklists } = useCardPanels();

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
              labels: [],
              properties: [],
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
      if (propertyOptionIds.length > 0 && data.publicId) {
        try {
          for (const optionPublicId of propertyOptionIds) {
            await utils.client.card.addOrRemoveProperty.mutate({
              cardPublicId: data.publicId,
              optionPublicId,
            });
          }
        } catch {
          // Property attachment failed silently — user can set it manually
        }
      }
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
          memberPublicIds: [] as string[],
          propertyOptionIds: [] as string[],
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
    const titleElement = document.getElementById("title") as HTMLTextAreaElement;
    if (titleElement) titleElement.focus();
  }, []);

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
      labelPublicIds: [],
      memberPublicIds: data.memberPublicIds,
      position: "start",
      dueDate: data.dueDate ?? null,
    });
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

  const handleToggleProperty = (optionPublicId: string, group: { type: string; options: { publicId: string }[] }): void => {
    const isSelected = propertyOptionIds.includes(optionPublicId);
    if (group.type === "single-select") {
      const sameGroup = group.options.map((o) => o.publicId);
      const withoutGroup = propertyOptionIds.filter((id) => !sameGroup.includes(id));
      if (isSelected) {
        setValue("propertyOptionIds", withoutGroup);
      } else {
        setValue("propertyOptionIds", [...withoutGroup, optionPublicId]);
      }
    } else {
      if (isSelected) {
        setValue("propertyOptionIds", propertyOptionIds.filter((id) => id !== optionPublicId));
      } else {
        setValue("propertyOptionIds", [...propertyOptionIds, optionPublicId]);
      }
    }
  };

  const propertyGroups = addBoardData?.propertyGroups ?? [];
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
                {propertyGroups.length > 0 && propertyGroups.map((group: any) => {
                  const selectedIds = propertyOptionIds.filter((id: string) =>
                    group.options.some((o: any) => o.publicId === id),
                  );
                  const items = group.options.map((option: any) => ({
                    key: option.publicId,
                    value: option.name,
                    selected: selectedIds.includes(option.publicId),
                    leftIcon: option.colourCode ? (
                      <LabelIcon colourCode={option.colourCode} />
                    ) : undefined,
                  }));
                  const trigger = selectedIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedIds.map((id: string) => {
                        const option = group.options.find((o: any) => o.publicId === id);
                        if (!option) return null;
                        return (
                          <Badge
                            key={option.publicId}
                            value={option.name}
                            colourCode={option.colourCode}
                            variant="notion"
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-light-800 dark:text-dark-800">
                      {group.name}
                    </span>
                  );
                  return (
                    <div key={group.publicId}>
                      <CheckboxDropdown
                        items={items}
                        handleSelect={(_, item) => handleToggleProperty(item.key, group)}
                        className="relative inline-flex items-center text-left"
                      >
                        {trigger}
                      </CheckboxDropdown>
                    </div>
                  );
                })}
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

    </>
  );
}
