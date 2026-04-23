import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { HiCheckBadge, HiXMark } from "react-icons/hi2";
import { IoChevronForwardSharp } from "react-icons/io5";

import { authClient } from "@kan/auth/client";
import type { RouterInputs } from "@kan/api";

import Avatar from "~/components/Avatar";
import DocEditorForCard, { type DocEditorForCardHandle } from "~/views/docs/components/DocEditorForCard";
import FeedbackModal from "~/components/FeedbackModal";
import { LabelForm } from "~/components/LabelForm";
import LabelIcon from "~/components/LabelIcon";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import { EditYouTubeModal } from "~/components/YouTubeEmbed/EditYouTubeModal";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { useChecklistPanel } from "~/providers/checklist-panel";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { DeleteLabelConfirmation } from "../../components/DeleteLabelConfirmation";
import ActivityList from "./components/ActivityList";
import { AttachmentThumbnails } from "./components/AttachmentThumbnails";
import { AttachmentUpload } from "./components/AttachmentUpload";
import { DeleteCardConfirmation } from "./components/DeleteCardConfirmation";
import { DeleteCommentConfirmation } from "./components/DeleteCommentConfirmation";
import Dropdown from "./components/Dropdown";
import { DueDateSelector } from "./components/DueDateSelector";
import LabelSelector from "./components/LabelSelector";
import ListSelector from "./components/ListSelector";
import MemberSelector from "./components/MemberSelector";
import NewCardPage from "./components/NewCardPage";
import NewCommentForm from "./components/NewCommentForm";

interface FormValues {
  cardId: string;
  title: string;
  description: string;
}

type BoardQueryParams = RouterInputs["board"]["byId"];

export function CardActivityPanel({ isTemplate, cardPublicId: cardPublicIdOverride }: { 
  isTemplate?: boolean; 
  cardPublicId?: string;
}) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const cardId = cardPublicIdOverride ?? (Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId);

  const { data: card } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  const board = card?.list?.board;
  const workspaceMembers = board?.workspace?.members;

  const editorWorkspaceMembers =
    workspaceMembers
      ?.filter((member) => member.email)
      .map((member) => ({
        publicId: member.publicId,
        email: member.email,
        user: member.user
          ? {
              id: member.user.id,
              name: member.user.name ?? null,
              image: member.user.image ?? null,
            }
          : null,
      })) ?? [];

  return (
    <div className="h-full min-h-0 w-[360px] overflow-y-auto border-l-[1px] border-light-300 bg-light-100 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900">
      <div className="pt-[18px]">
        <h2 className="pb-4 text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
          {t`Activity`}
        </h2>
        {!isTemplate && (
          <div className="mb-6">
            <NewCommentForm
              cardPublicId={cardId ?? ""}
              workspaceMembers={editorWorkspaceMembers}
            />
          </div>
        )}
        <div>
          <ActivityList
            cardPublicId={cardId ?? ""}
            isLoading={!card}
            isAdmin={workspace.role === "admin"}
          />
        </div>
      </div>
    </div>
  );
}

export default function CardPage({ isTemplate, cardPublicId: cardPublicIdOverride, isSlideOver, onClose, mode, boardPublicId, listPublicId, queryParams, preSelectedLabelId, preSelectedMemberId, preSelectedDueDate }: {
  isTemplate?: boolean;
  cardPublicId?: string;
  isSlideOver?: boolean;
  onClose?: () => void;
  mode?: "view" | "add";
  boardPublicId?: string;
  listPublicId?: string;
  queryParams?: BoardQueryParams;
  preSelectedLabelId?: string;
  preSelectedMemberId?: string;
  preSelectedDueDate?: Date;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const editorRef = useRef<DocEditorForCardHandle>(null);
  const {
    modalContentType,
    entityId,
    clearModalState,
    isOpen,
    modalStates,
  } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { canEditCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const { isOpen: checklistPanelOpen, toggle: toggleChecklistPanel } = useChecklistPanel();

  const cardId = cardPublicIdOverride ?? (Array.isArray(router.query.cardId)
    ? router.query.cardId[0]
    : router.query.cardId);

  const { data: card, isLoading, error } = api.card.byId.useQuery(
    { cardPublicId: cardId ?? "" },
    { enabled: !!cardId && cardId.length >= 12 },
  );

  useEffect(() => {
    if (isSlideOver) return;
    if (router.isReady && cardId && !isLoading) {
      if (error?.data?.code === "NOT_FOUND" || (!card && !isLoading)) {
        router.replace("/404");
      }
    }
  }, [router, cardId, isLoading, error, card, isSlideOver]);

  const isCreator = card?.createdBy && session?.user.id === card.createdBy;
  const canEdit = canEditCard || isCreator;

  const refetchCard = async () => {
    if (cardId) await utils.card.byId.refetch({ cardPublicId: cardId });
  };

  const board = card?.list.board;
  const workspaceMembers = board?.workspace.members;
  const boardId = board?.publicId;
  const labels = board?.labels;
  const selectedLabels = card?.labels;
  const selectedMembers = card?.members;

  const formattedLabels =
    labels?.map((label) => {
      const isSelected = selectedLabels?.some(
        (selectedLabel) => selectedLabel.publicId === label.publicId,
      );

      return {
        key: label.publicId,
        value: label.name,
        selected: isSelected ?? false,
        leftIcon: <LabelIcon colourCode={label.colourCode} />,
        colourCode: label.colourCode,
      };
    }) ?? [];

  const formattedLists =
    board?.lists.map((list) => ({
      key: list.publicId,
      value: list.name,
      selected: list.publicId === card?.list?.publicId,
    })) ?? [];

  const formattedMembers =
    workspaceMembers?.map((member) => {
      const isSelected = selectedMembers?.some(
        (assignedMember) => assignedMember.publicId === member.publicId,
      );

      return {
        key: member.publicId,
        value: formatMemberDisplayName(
          member.user?.name ?? null,
          member.user?.email ?? member.email,
        ),
        imageUrl: member.user?.image
          ? getAvatarUrl(member.user.image)
          : undefined,
        selected: isSelected ?? false,
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
      };
    }) ?? [];

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardId) await invalidateCard(utils, cardId);
    },
  });

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to add label`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      if (cardId) {
        await utils.card.byId.invalidate({ cardPublicId: cardId });
      }
    },
  });

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    values: {
      cardId: cardId ?? "",
      title: card?.title ?? "",
      description: card?.description ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateCard.mutate({
      cardPublicId: values.cardId,
      title: values.title,
      description: values.description,
    });
  };

  useEffect(() => {
    const newLabelId = modalStates.NEW_LABEL_CREATED;
    if (newLabelId && cardId) {
      const isAlreadyAdded = card?.labels.some(
        (label) => label.publicId === newLabelId,
      );

      if (!isAlreadyAdded) {
        addOrRemoveLabel.mutate({
          cardPublicId: cardId,
          labelPublicId: newLabelId,
        });
      }
      clearModalState("NEW_LABEL_CREATED");
    }
  }, [modalStates.NEW_LABEL_CREATED, card, cardId]);

  useEffect(() => {
    const titleTextarea = document.getElementById(
      "title",
    ) as HTMLTextAreaElement;
    if (titleTextarea) {
      titleTextarea.style.height = "auto";
      titleTextarea.style.height = `${titleTextarea.scrollHeight}px`;
    }
  }, [card]);

  const handleContentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "BUTTON" || target.closest("button")) return;
      if (target.tagName === "A" || target.closest("a")) return;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (target.tagName === "SELECT") return;
      if (target.closest("[role=\"listbox\"]") || target.closest("[role=\"option\"]")) return;
      if (target.closest(".bn-editor")) return;
      editorRef.current?.focus();
    },
    [],
  );

  if (mode === "add") {
    return (
      <NewCardPage
        isTemplate={isTemplate}
        onClose={onClose}
        boardPublicId={boardPublicId}
        listPublicId={listPublicId}
        queryParams={queryParams}
        preSelectedLabelId={preSelectedLabelId}
        preSelectedMemberId={preSelectedMemberId}
        preSelectedDueDate={preSelectedDueDate}
      />
    );
  }

  if (!cardId) return <></>;

  return (
    <>
      <PageHead
        title={t`${card?.title ?? t`Card`} | ${board?.name ?? t`Board`}`}
      />
      <div className={isSlideOver ? "flex h-full flex-col" : "flex h-full flex-1 flex-col overflow-hidden"}>
        {!isSlideOver && (
        <div className="flex w-full items-center justify-between border-b-[1px] border-light-300 bg-light-50 px-8 py-2 dark:border-dark-300 dark:bg-dark-50">
          {!card && isLoading && (
            <div className="flex space-x-2">
              <div className="h-[1.5rem] w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
            </div>
          )}
          {card && (
            <>
              <div className="flex items-center gap-1">
                <Link
                  className="whitespace-nowrapleading-[1.5rem] text-sm font-bold text-light-900 dark:text-dark-950"
                  href={`${isTemplate ? "/templates" : "/boards"}`}
                >
                  {workspace.name}
                </Link>
                <IoChevronForwardSharp className="h-[10px] w-[10px] text-light-900 dark:text-dark-900" />
                <Link
                  className="whitespace-nowrap text-sm font-bold leading-[1.5rem] text-light-900 dark:text-dark-950"
                  href={`${isTemplate ? "/templates" : "/boards"}/${board?.publicId}`}
                >
                  {board?.name}
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Dropdown
                  cardPublicId={cardId}
                  isTemplate={isTemplate}
                  boardPublicId={boardId}
                  cardCreatedBy={card?.createdBy}
                  onAddChecklist={toggleChecklistPanel}
                />
                <Link
                  href={`/${isTemplate ? "templates" : "boards"}/${boardId}`}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                  aria-label={t`Close`}
                >
                  <HiXMark className="h-4 w-4" />
                </Link>
              </div>
            </>
          )}
          {!card && !isLoading && (
            <p className="block p-0 py-0 font-bold leading-[1.5rem] tracking-tight text-light-900 dark:text-dark-900 sm:text-[1rem]">
              {t`Card not found`}
            </p>
          )}
        </div>
        )}
        {isSlideOver && card && (
          <div className="flex w-full items-center justify-end px-4 py-2">
            <Dropdown
              cardPublicId={cardId}
              isTemplate={isTemplate}
              boardPublicId={boardId}
              cardCreatedBy={card?.createdBy}
              onAddChecklist={toggleChecklistPanel}
            />
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
                aria-label={t`Close`}
              >
                <HiXMark className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div
          className={isSlideOver
            ? "w-full flex-1 overflow-y-auto"
            : "scrollbar-thumb-rounded-[4px] scrollbar-track-rounded-[4px] w-full flex-1 overflow-y-auto scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 hover:scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 dark:hover:scrollbar-thumb-dark-300"
          }
          onClick={handleContentClick}
        >
          <div className={`p-auto mx-auto flex h-full ${isSlideOver ? "w-[540px]" : "w-[800px]"} flex-col`}>
            <div className="p-6 md:p-8">
              <div className="mb-8 md:mt-4">
                {!card && isLoading && (
                  <div className="flex space-x-2">
                    <div className="h-[2.3rem] w-[300px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
                  </div>
                )}
                {card && (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="w-full space-y-6"
                  >
                    <div>
                      <textarea
                        id="title"
                        {...register("title")}
                        onBlur={canEdit ? handleSubmit(onSubmit) : undefined}
                        rows={1}
                        disabled={!canEdit}
                        className={`block w-full resize-none overflow-hidden border-0 bg-transparent p-0 py-0 font-bold leading-relaxed text-neutral-900 focus:ring-0 dark:text-dark-1000 sm:text-[1.2rem] ${!canEdit ? "cursor-default" : ""}`}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                      />
                    </div>
                  </form>
                )}
                {!card && !isLoading && (
                  <p className="block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
                    {t`Card not found`}
                  </p>
                )}
              </div>
              {card && (
                <>
                  <div className="mb-0 flex flex-wrap items-center gap-2">
                    <ListSelector
                      cardPublicId={cardId ?? ""}
                      lists={formattedLists}
                      isLoading={!card}
                      disabled={!canEdit}
                    />
                    <LabelSelector
                      cardPublicId={cardId ?? ""}
                      labels={formattedLabels}
                      isLoading={!card}
                      disabled={!canEdit}
                    />
                    {!isTemplate && (
                      <MemberSelector
                        cardPublicId={cardId ?? ""}
                        members={formattedMembers}
                        isLoading={!card}
                        disabled={!canEdit}
                      />
                    )}
                    <DueDateSelector
                      cardPublicId={cardId ?? ""}
                      dueDate={card?.dueDate}
                      isLoading={!card}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="my-6 h-[1px] bg-light-500 dark:bg-dark-500" />
                  <div className="mb-0 flex w-full flex-col justify-between">
                    <form
                      onSubmit={handleSubmit(onSubmit)}
                      className="w-full space-y-6"
                    >
                      <div className="mt-2 min-h-[200px]">
                        <DocEditorForCard
                          ref={editorRef}
                          initialContent={card.description}
                          onChange={
                            canEdit
                              ? (value) => setValue("description", value)
                              : undefined
                          }
                          readOnly={!canEdit}
                        />
                      </div>
                    </form>
                  </div>
                  {!isTemplate && (
                    <>
                      {card?.attachments.length > 0 && (
                        <div className="mt-6">
                          <AttachmentThumbnails
                            attachments={card.attachments}
                            cardPublicId={cardId ?? ""}
                            isReadOnly={!canEdit}
                          />
                        </div>
                      )}
                      {canEdit && !isSlideOver && (
                        <div className="mt-6 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={toggleChecklistPanel}
                            title={checklistPanelOpen ? t`Hide checklists` : t`Checklists`}
                            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                              checklistPanelOpen
                                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                : "text-light-950 hover:bg-light-300 dark:text-dark-950 dark:hover:bg-dark-200"
                            }`}
                          >
                            <HiCheckBadge className="h-5 w-5" />
                          </button>
                          <AttachmentUpload cardPublicId={cardId} />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {isSlideOver && !isTemplate && canEdit && (
          <div className="flex items-center justify-end gap-1 border-t border-light-300 bg-light-50 px-8 py-2 dark:border-dark-300 dark:bg-dark-50">
            <button
              type="button"
              onClick={toggleChecklistPanel}
              title={checklistPanelOpen ? t`Hide checklists` : t`Checklists`}
              className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                checklistPanelOpen
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                  : "text-light-950 hover:bg-light-300 dark:text-dark-950 dark:hover:bg-dark-200"
              }`}
            >
              <HiCheckBadge className="h-5 w-5" />
            </button>
            <AttachmentUpload cardPublicId={cardId} />
          </div>
        )}

        <>
          <Modal
            modalSize="md"
            isVisible={isOpen && modalContentType === "NEW_FEEDBACK"}
          >
            <FeedbackModal />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_LABEL"}
          >
            <LabelForm boardPublicId={boardId ?? ""} refetch={refetchCard} />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_LABEL"}
          >
            <LabelForm
              boardPublicId={boardId ?? ""}
              refetch={refetchCard}
              isEdit
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_LABEL"}
          >
            <DeleteLabelConfirmation
              refetch={refetchCard}
              labelPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_CARD"}
          >
            <DeleteCardConfirmation
              boardPublicId={boardId ?? ""}
              cardPublicId={cardId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "DELETE_COMMENT"}
          >
            <DeleteCommentConfirmation
              cardPublicId={cardId}
              commentPublicId={entityId}
            />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "NEW_WORKSPACE"}
          >
            <NewWorkspaceForm />
          </Modal>

          <Modal
            modalSize="sm"
            isVisible={isOpen && modalContentType === "EDIT_YOUTUBE"}
          >
            <EditYouTubeModal />
          </Modal>
        </>
      </div>
    </>
  );
}
