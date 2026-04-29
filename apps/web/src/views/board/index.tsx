import type { DropResult } from "react-beautiful-dnd";
import { useParams } from "next/navigation";
import { useRouter } from "next/router";
import { env } from "next-runtime-env";
import { t } from "@lingui/core/macro";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DragDropContext, Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import {
  HiOutlinePlusSmall,
  HiOutlineRectangleStack,
  HiOutlineSquare3Stack3D,
} from "react-icons/hi2";

import type { UpdateBoardInput } from "@kan/api/types";

import type { CardContextMenuAction } from "./components/CardContextMenu";
import Button from "~/components/Button";
import { DeleteLabelConfirmation } from "~/components/DeleteLabelConfirmation";
import { LabelForm } from "~/components/LabelForm";
import Modal from "~/components/modal";
import { NewWorkspaceForm } from "~/components/NewWorkspaceForm";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { PropertyGroupManager } from "~/components/PropertyGroupManager";
import { StrictModeDroppable as Droppable } from "~/components/StrictModeDroppable";
import { Tooltip } from "~/components/Tooltip";
import { EditYouTubeModal } from "~/components/YouTubeEmbed/EditYouTubeModal";
import { useDragToScroll } from "~/hooks/useDragToScroll";
import { usePermissions } from "~/hooks/usePermissions";
import { useScrollRestore } from "~/hooks/useScrollRestore";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { formatToArray } from "~/utils/helpers";
import { DeleteCardConfirmation } from "~/views/card/components/DeleteCardConfirmation";
import BoardDropdown from "./components/BoardDropdown";
import Card from "./components/Card";
import CardSlideOver from "~/components/CardSlideOver";
import { CardContextDueDateModal } from "./components/CardContextDueDateModal";
import { CardContextDuplicateModal } from "./components/CardContextDuplicateModal";
import { CardContextLabelsModal } from "./components/CardContextLabelsModal";
import { CardContextMembersModal } from "./components/CardContextMembersModal";
import { CardContextMenu } from "./components/CardContextMenu";
import { CardContextMoveListModal } from "./components/CardContextMoveListModal";
import { DeleteBoardConfirmation } from "./components/DeleteBoardConfirmation";
import { DeleteListConfirmation } from "./components/DeleteListConfirmation";
import Filters from "./components/Filters";
import GroupButton from "./components/GroupButton";
import List from "./components/List";
import SortButton from "./components/SortButton";
import { NewListForm } from "./components/NewListForm";
import { NewTemplateForm } from "./components/NewTemplateForm";
import UpdateBoardSlugButton from "./components/UpdateBoardSlugButton";
import { UpdateBoardSlugForm } from "./components/UpdateBoardSlugForm";
import ViewSwitchButton from "./components/ViewSwitchButton";
import SheetView from "./components/SheetView";
import type { SheetGroup } from "./components/SheetView";
import VisibilityButton from "./components/VisibilityButton";


type CardData = {
  publicId: string;
  title: string;
  description: string | unknown[] | null;
  index: number;
  dueDate: Date | null;
  labels: { publicId: string; name: string; colourCode: string | null }[];
  properties: { publicId: string; name: string; colourCode: string | null; groupId: number }[];
  members: {
    publicId: string;
    email: string;
    user: {
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }[];
  attachments: { publicId: string }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  comments: { publicId: string }[];
  docs: { publicId: string }[];
};

type VirtualList = {
  publicId: string;
  name: string;
  index: number;
  cards: CardData[];
  colourCode: string | null;
};

type PropertyGroup = {
  publicId: string;
  name: string;
  type: string;
  index: number;
  options: {
    publicId: string;
    name: string;
    colourCode: string | null;
    index: number;
  }[];
};

function getPropertyGroupedLists(
  allCards: CardData[],
  group: PropertyGroup,
): VirtualList[] {
  return group.options.map((option, index) => ({
    publicId: `virtual-prop-${option.publicId}`,
    name: option.name,
    index,
    colourCode: option.colourCode,
    cards: allCards.filter((card) =>
      card.properties.some((p) => p.publicId === option.publicId),
    ),
  })).filter((list) => list.cards.length > 0);
}

function getSortKey(
  card: CardData,
  mode: "alphabet" | "due",
): string | number {
  if (mode === "alphabet") {
    return card.title.toLowerCase();
  }
  if (!card.dueDate) return "\uFFFF";
  return new Date(card.dueDate).getTime();
}

function getSortedCards(
  cards: CardData[],
  sortMode: string,
  sortDir: "asc" | "desc",
): CardData[] {
  if (!sortMode || (sortMode !== "alphabet" && sortMode !== "due"))
    return cards;
  return [...cards].sort((a, b) => {
    const keyA = getSortKey(a, sortMode as "alphabet" | "due");
    const keyB = getSortKey(b, sortMode as "alphabet" | "due");
    const cmp = typeof keyA === "number" && typeof keyB === "number"
      ? keyA - keyB
      : String(keyA).localeCompare(String(keyB));
    return sortDir === "desc" ? -cmp : cmp;
  });
}

type PublicListId = string;

export default function BoardPage({ isTemplate }: { isTemplate?: boolean }) {
  const params = useParams() as { boardId: string | string[] } | null;
  const router = useRouter();
  const utils = api.useUtils();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const { openModal, modalContentType, entityId, isOpen, setModalState, closeModal } =
    useModal();
  const [selectedPublicListId, setSelectedPublicListId] =
    useState<PublicListId>("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  type SlideOverState =
    | { mode: "closed" }
    | { mode: "view"; cardPublicId: string }
    | { mode: "add"; listPublicId: string; preSelectedLabelId?: string; preSelectedMemberId?: string; preSelectedDueDate?: Date; preSelectedPropertyId?: string };

  const urlCardId = (router.query.card as string) || null;
  const [slideOverState, setSlideOverState] = useState<SlideOverState>(
    urlCardId ? { mode: "view", cardPublicId: urlCardId } : { mode: "closed" },
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cardPublicId: string;
  } | null>(null);

  const viewMode = (router.query.view as string) || "kanban";

  useEffect(() => {
    const cardId = (router.query.card as string) || null;
    setSlideOverState((prev) => {
      if (cardId) {
        if (prev.mode === "view" && prev.cardPublicId === cardId) return prev;
        return { mode: "view", cardPublicId: cardId };
      }
      if (prev.mode !== "view") return prev;
      return { mode: "closed" };
    });
  }, [router.query.card]);

  const handleOpenCard = (cardPublicId: string) => {
    setSlideOverState({ mode: "view", cardPublicId });
    setTimeout(() => {
      void router.push(
        { pathname: router.pathname, query: { ...router.query, card: cardPublicId } },
        undefined,
        { shallow: true },
      );
    }, 300);
  };

  const handleCloseCard = () => {
    setSlideOverState({ mode: "closed" });
    const { card: _, ...rest } = router.query;
    void router.push({ pathname: router.pathname, query: rest }, undefined, { shallow: true });
  };

  const { ref: scrollRef, onMouseDown } = useDragToScroll({
    enabled: viewMode === "kanban",
    direction: "horizontal",
  });

  const { canCreateList, canCreateCard, canEditList, canEditCard, canEditBoard } =
    usePermissions();

  const { tooltipContent: createListShortcutTooltipContent } =
    useKeyboardShortcut({
      type: "PRESS",
      stroke: { key: "C" },
      action: () => boardId && canCreateList && openNewListForm(boardId),
      description: t`Create new list`,
      group: "ACTIONS",
    });

  const boardId = params?.boardId
    ? Array.isArray(params.boardId)
      ? params.boardId[0]
      : params.boardId
    : null;

  const updateBoard = api.board.update.useMutation();

  const { register, handleSubmit, setValue } = useForm<UpdateBoardInput>({
    values: {
      boardPublicId: boardId ?? "",
      name: "",
    },
  });

  const onSubmit = (values: UpdateBoardInput) => {
    updateBoard.mutate({
      boardPublicId: values.boardPublicId,
      name: values.name,
    });
  };

  const semanticFilters = formatToArray(router.query.dueDate) as (
    | "overdue"
    | "today"
    | "tomorrow"
    | "next-week"
    | "next-month"
    | "no-due-date"
  )[];

  const boardType: "regular" | "template" = isTemplate ? "template" : "regular";

  const groupBy = (router.query.groupBy as string) || "";
  const sortMode = (router.query.sort as string) || "";
  const sortDir = ((router.query.sortDir as string) || "asc") as "asc" | "desc";
  const propertyFilterIds = formatToArray(router.query.properties);

  const queryParams = {
    boardPublicId: boardId ?? "",
    members: formatToArray(router.query.members),
    labels: formatToArray(router.query.labels),
    lists: formatToArray(router.query.lists),
    ...(semanticFilters.length > 0 && {
      dueDateFilters: semanticFilters,
    }),
    type: boardType,
  };

  const {
    data: boardData,
    isSuccess,
    isLoading: isQueryLoading,
    error,
  } = api.board.byId.useQuery(queryParams, {
    enabled: !!boardId,
    placeholderData: keepPreviousData,
  });

  // Redirect to 404 if board doesn't exist
  useEffect(() => {
    if (router.isReady && boardId && !isQueryLoading) {
      if (
        error?.data?.code === "NOT_FOUND" ||
        (!boardData && !isQueryLoading)
      ) {
        router.replace("/404");
      }
    }
  }, [router, boardId, isQueryLoading, error, boardData]);

  const refetchBoard = async () => {
    if (boardId) await utils.board.byId.refetch({ boardPublicId: boardId });
  };

  useEffect(() => {
    if (boardId) {
      setIsInitialLoading(false);
    }
  }, [boardId]);

  const isLoading = isInitialLoading || isQueryLoading;

  useScrollRestore(
    boardId,
    scrollRef,
    router,
    viewMode === "kanban" && !isLoading && (boardData?.lists.length ?? 0) > 0,
  );

  const updateListMutation = api.list.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const currentIndex = sourceList?.index;

        if (currentIndex === undefined) return oldBoard;

        const removedList = updatedLists.splice(currentIndex, 1)[0];

        if (removedList && args.index !== undefined) {
          updatedLists.splice(args.index, 0, removedList);

          return {
            ...oldBoard,
            lists: updatedLists,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to update list`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const updateCardMutation = api.card.update.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = Array.from(oldBoard.lists);

        const sourceList = updatedLists.find((list) =>
          list.cards.some((card) => card.publicId === args.cardPublicId),
        );
        const destinationList = updatedLists.find(
          (list) => list.publicId === args.listPublicId,
        );

        const cardToMove = sourceList?.cards.find(
          (card) => card.publicId === args.cardPublicId,
        );

        if (!cardToMove) return oldBoard;

        const removedCard = sourceList?.cards.splice(cardToMove.index, 1)[0];

        if (
          sourceList &&
          destinationList &&
          removedCard &&
          args.index !== undefined
        ) {
          destinationList.cards.splice(args.index, 0, removedCard);

          return {
            ...oldBoard,
            lists: updatedLists,
          };
        }
      });

      return { previousState: currentState };
    },
    onError: (_error, _newList, context) => {
      utils.board.byId.setData(queryParams, context?.previousState);
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  useEffect(() => {
    if (isSuccess && boardData) {
      setValue("name", boardData.name || "");
    }
  }, [isSuccess, boardData, setValue]);

  const openNewListForm = (publicBoardId: string) => {
    openModal("NEW_LIST");
    setSelectedPublicListId(publicBoardId);
  };

  const handleVirtualAddCard = (
    virtualListPublicId: string,
  ) => {
    if (!boardData) return;

    const firstRealListId = boardData.lists[0]?.publicId ?? "";

    const optionPublicId = virtualListPublicId.replace("virtual-prop-", "");

    setSlideOverState({
      mode: "add",
      listPublicId: firstRealListId,
      preSelectedPropertyId: optionPublicId,
    });
  };

  const handleCardContextMenuAction = (action: CardContextMenuAction) => {
    const cardPublicId = contextMenu?.cardPublicId;
    if (!cardPublicId) return;
    setContextMenu(null);
    if (action === "copyLink") {
      const path = isTemplate
        ? `/templates/${boardId}/cards/${cardPublicId}`
        : `/cards/${cardPublicId}`;
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}${path}`;
      void navigator.clipboard.writeText(url).then(
        () => {
          showPopup({
            header: t`Link copied`,
            icon: "success",
            message: t`Card URL copied to clipboard`,
          });
        },
        () => {
          showPopup({
            header: t`Unable to copy link`,
            icon: "error",
            message: t`Please try again.`,
          });
        },
      );
      return;
    }
    if (action === "duplicate") {
      setModalState("CARD_CONTEXT_DUPLICATE", {
        boardPublicId: boardId ?? "",
        isTemplate: !!isTemplate,
      });
      openModal("CARD_CONTEXT_DUPLICATE", cardPublicId);
      return;
    }
    if (action === "delete") {
      openModal("DELETE_CARD", cardPublicId);
      return;
    }
    const modalType =
      action === "members"
        ? "CARD_CONTEXT_MEMBERS"
        : action === "move"
          ? "CARD_CONTEXT_MOVE_LIST"
          : action === "labels"
            ? "CARD_CONTEXT_LABELS"
            : "CARD_CONTEXT_DUE_DATE";
    openModal(modalType, cardPublicId);
  };

  const onDragEnd = ({
    source: _source,
    destination,
    draggableId,
    type,
  }: DropResult): void => {
    if (!destination) {
      return;
    }

    if (type === "LIST" && canEditList) {
      updateListMutation.mutate({
        listPublicId: draggableId,
        index: destination.index,
      });
    }

    if (type === "CARD" && canEditCard) {
      updateCardMutation.mutate({
        cardPublicId: draggableId,

        listPublicId: destination.droppableId,
        index: destination.index,
      });
    }
  };

  const renderModalContent = () => {
    return (
      <>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_BOARD"}
        >
          <DeleteBoardConfirmation
            isTemplate={!!isTemplate}
            boardPublicId={boardId ?? ""}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_LIST"}
        >
          <DeleteListConfirmation
            listPublicId={selectedPublicListId}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "NEW_LIST"}
        >
          <NewListForm
            boardPublicId={boardId ?? ""}
            queryParams={queryParams}
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

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "UPDATE_BOARD_SLUG"}
        >
          <UpdateBoardSlugForm
            boardPublicId={boardId ?? ""}
            workspaceSlug={workspace.slug ?? ""}
            boardSlug={boardData?.slug ?? ""}
            queryParams={queryParams}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CREATE_TEMPLATE"}
        >
          <NewTemplateForm
            workspacePublicId={workspace.publicId ?? ""}
            sourceBoardPublicId={boardId ?? ""}
            sourceBoardName={boardData?.name ?? ""}
          />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "EDIT_YOUTUBE"}
        >
          <EditYouTubeModal />
        </Modal>

        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CARD_CONTEXT_MEMBERS"}
        >
          <CardContextMembersModal />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CARD_CONTEXT_MOVE_LIST"}
        >
          <CardContextMoveListModal />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CARD_CONTEXT_LABELS"}
        >
          <CardContextLabelsModal />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "CARD_CONTEXT_DUE_DATE"}
        >
          <CardContextDueDateModal />
        </Modal>
        <Modal
          modalSize="md"
          isVisible={isOpen && modalContentType === "CARD_CONTEXT_DUPLICATE"}
        >
          <CardContextDuplicateModal
            boardPublicId={boardId ?? ""}
            isTemplate={!!isTemplate}
          />
        </Modal>
        <Modal
          modalSize="sm"
          isVisible={isOpen && modalContentType === "DELETE_CARD"}
        >
          <DeleteCardConfirmation
            cardPublicId={entityId}
            boardPublicId={boardId ?? ""}
          />
        </Modal>
        <Modal
          modalSize="md"
          isVisible={isOpen && modalContentType === "PROPERTY_GROUPS"}
        >
          {boardId && boardData && (
            <PropertyGroupManager
              boardPublicId={boardId}
              groups={boardData.propertyGroups}
              onClose={closeModal}
            />
          )}
        </Modal>
      </>
    );
  };

  return (
    <>
      <PageHead
        title={`${boardData?.name ?? (isTemplate ? t`Board` : t`Template`)} | ${workspace.name ?? t`Workspace`}`}
      />
      <div className="relative flex h-full flex-col">
        <PatternedBackground />
        <div className="z-10 flex w-full flex-col justify-between p-6 md:flex-row md:p-8">
          {isLoading && !boardData && (
            <div className="flex space-x-2">
              <div className="h-[2.3rem] w-[150px] animate-pulse rounded-[5px] bg-light-200 dark:bg-dark-100" />
            </div>
          )}
          {boardData && (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="order-2 focus-visible:outline-none md:order-1"
            >
              <input
                id="name"
                type="text"
                {...register("name")}
                onBlur={canEditBoard ? handleSubmit(onSubmit) : undefined}
                readOnly={!canEditBoard}
                className="block border-0 bg-transparent p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 focus:ring-0 focus-visible:outline-none disabled:cursor-not-allowed dark:text-dark-1000 sm:text-[1.2rem]"
              />
            </form>
          )}
          {!boardData && !isLoading && (
            <p className="order-2 block p-0 py-0 font-bold leading-[2.3rem] tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem] md:order-1">
              {t`${isTemplate ? "Template" : "Board"} not found`}
            </p>
          )}
          <div className="order-1 mb-4 flex items-center justify-end gap-4 md:order-2 md:mb-0">
            {isTemplate && (
              <div className="inline-flex cursor-default items-center justify-center whitespace-nowrap rounded-md border-[1px] border-light-300 bg-light-50 px-3 py-2 text-sm font-semibold text-light-950 shadow-sm dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950">
                <span className="mr-2">
                  <HiOutlineRectangleStack />
                </span>
                {t`Template`}
              </div>
            )}
            {!isTemplate && (
              <>
                <UpdateBoardSlugButton
                  handleOnClick={() => openModal("UPDATE_BOARD_SLUG")}
                  isLoading={isLoading}
                  workspaceSlug={workspace.slug ?? ""}
                  boardSlug={boardData?.slug ?? ""}
                  boardPublicId={boardId ?? ""}
                  visibility={boardData?.visibility ?? "private"}
                  canEdit={canEditBoard}
                />
                <VisibilityButton
                  visibility={boardData?.visibility ?? "private"}
                  boardPublicId={boardId ?? ""}
                  boardSlug={boardData?.slug ?? ""}
                  queryParams={queryParams}
                  isLoading={!boardData}
                  isAdmin={workspace.role === "admin"}
                />
                {boardData && (
                  <>
                    <SortButton isLoading={!boardData} />
                    <Filters
                      propertyGroups={boardData.propertyGroups}
                      members={boardData.workspace.members.filter(
                        (member) => member.user !== null,
                      )}
                      position="left"
                      isLoading={!boardData}
                    />
                  </>
                )}
                <GroupButton isLoading={!boardData} propertyGroups={boardData?.propertyGroups ?? []} />
                <ViewSwitchButton isLoading={!boardData} />
              </>
            )}
            <Tooltip
              content={
                !canCreateList
                  ? t`You don't have permission`
                  : createListShortcutTooltipContent
              }
            >
              <Button
                iconLeft={
                  <HiOutlinePlusSmall
                    className="-mr-0.5 h-5 w-5"
                    aria-hidden="true"
                  />
                }
                onClick={() => {
                  if (boardId && canCreateList) openNewListForm(boardId);
                }}
                disabled={!boardData || !canCreateList}
              >
                {t`New list`}
              </Button>
            </Tooltip>
            <BoardDropdown
              isTemplate={!!isTemplate}
              isLoading={!boardData}
              boardPublicId={boardId ?? ""}
              isArchived={boardData?.isArchived ?? false}
              isFavorite={boardData?.favorite}
              boardName={boardData?.name}
            />
          </div>
        </div>

        <div
          ref={scrollRef}
          onMouseDown={viewMode === "kanban" ? onMouseDown : undefined}
          className={`scrollbar-w-none scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-h-[8px] z-0 flex-1 overscroll-contain scrollbar scrollbar-track-light-200 scrollbar-thumb-light-400 dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-300 ${viewMode === "kanban" ? "overflow-y-hidden overflow-x-scroll" : "overflow-y-auto overflow-x-hidden"}`}
        >
          {isLoading ? (
            <div className="ml-[2rem] flex">
              <div className="0 mr-5 h-[500px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              <div className="0 mr-5 h-[275px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
              <div className="0 mr-5 h-[375px] w-[18rem] animate-pulse rounded-md bg-light-200 dark:bg-dark-100" />
            </div>
          ) : boardData ? (
            <>
              {(() => {
                const activeGroup = groupBy
                  ? boardData.propertyGroups.find((g) => g.publicId === groupBy)
                  : null;
                const isGroupByMode = !!activeGroup;

                // Build lookup of starred group IDs for filtering properties on cards
                const starredGroupIds = new Set(
                  boardData.propertyGroups.filter((g: any) => g.showOnCard).map((g: any) => g.id)
                );

                const filteredLists = propertyFilterIds.length > 0
                  ? boardData.lists.map((list) => ({
                      ...list,
                      cards: list.cards.filter((card) =>
                        propertyFilterIds.some((filterId) =>
                          card.properties.some((p) => p.publicId === filterId),
                        ),
                      ),
                    }))
                  : boardData.lists;

                const cardListNameMap = new Map<string, string>();
                if (isGroupByMode) {
                  filteredLists.forEach((list) => {
                    list.cards.forEach((card) => {
                      cardListNameMap.set(card.publicId, list.name);
                    });
                  });
                }
                const virtualLists = isGroupByMode && activeGroup
                  ? getPropertyGroupedLists(
                      filteredLists.flatMap((l) => l.cards),
                      activeGroup,
                    )
                  : null;

                const displayLists: (
                  | { publicId: string; name: string; index: number; cards: CardData[]; colourCode?: string | null }
                  | null
                )[] = virtualLists ?? filteredLists;

                if (viewMode === "sheet") {
                  let flatCards = filteredLists.flatMap((list) =>
                    list.cards.map((card) => ({
                      ...card,
                      listName: list.name,
                      listPublicId: list.publicId,
                    }))
                  );

                  let sheetGroups: SheetGroup[] | undefined;

                  if (isGroupByMode && virtualLists) {
                    sheetGroups = virtualLists.map((vl) => ({
                      name: vl.name,
                      colourCode: vl.colourCode,
                      cards: vl.cards.map((card) => {
                        const existing = flatCards.find(
                          (fc) => fc.publicId === card.publicId,
                        );
                        return existing ?? {
                          ...card,
                          listName: cardListNameMap.get(card.publicId) ?? "",
                          listPublicId: "",
                        };
                      }),
                    }));
                  } else {
                    flatCards = sortMode
                      ? (getSortedCards(flatCards, sortMode, sortDir) as typeof flatCards)
                      : flatCards;
                  }

                  return (
                    <SheetView
                       cards={flatCards}
                       groups={sheetGroups}
                       boardPublicId={boardId ?? ""}
                       isTemplate={!!isTemplate}
                       onOpenCard={handleOpenCard}
                       propertyGroups={boardData.propertyGroups}
                       workspaceMembers={boardData.workspace.members.filter(
                         (member) => member.user !== null,
                       )}
                       allLists={boardData.allLists}
                       canEditCard={!!canEditCard}
                       canCreateCard={!!canCreateCard}
                       weekStartDay={workspace.weekStartDay ?? 1}
                      onContextMenu={(e, cardPublicId) => {
                        if (
                          cardPublicId.startsWith("PLACEHOLDER") ||
                          env("NEXT_PUBLIC_KAN_ENV") === "cloud"
                        )
                          return;
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, cardPublicId });
                      }}
                    />
                  );
                }

                if (displayLists.length === 0) {
                  return (
                    <div className="z-10 flex h-full w-full flex-col items-center justify-center space-y-8 pb-[150px]">
                      <div className="flex flex-col items-center">
                        <HiOutlineSquare3Stack3D className="h-10 w-10 text-light-800 dark:text-dark-800" />
                        <p className="mb-2 mt-4 text-[14px] font-bold text-light-1000 dark:text-dark-950">
                          {t`No lists`}
                        </p>
                        <p className="text-[14px] text-light-900 dark:text-dark-900">
                          {canCreateList
                            ? t`Get started by creating a new list`
                            : t`No lists have been created yet`}
                        </p>
                      </div>
                      <Tooltip
                        content={
                          !canCreateList ? t`You don't have permission` : undefined
                        }
                      >
                        <Button
                          onClick={() => {
                            if (boardId && canCreateList) openNewListForm(boardId);
                          }}
                          disabled={!canCreateList}
                        >
                          {t`Create new list`}
                        </Button>
                      </Tooltip>
                    </div>
                  );
                }

                return (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable
                      droppableId="all-lists"
                      direction="horizontal"
                      type="LIST"
                    >
                      {(provided) => (
                        <div
                          className="flex"
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                        >
                          <div className="min-w-[2rem]" />
                          {displayLists.map((list, listIndex) => {
                            if (!list) return null;
                            const sortedCards = sortMode
                              ? getSortedCards(list.cards, sortMode, sortDir)
                              : list.cards;
                            return (
                              <List
                                 index={listIndex}
                                 key={listIndex}
                                 list={list}
                                 isVirtual={!!isGroupByMode}
                                 onOpenNewCard={(publicListId) =>
                                   setSlideOverState({
                                     mode: "add",
                                     listPublicId: publicListId,
                                   })
                                 }
                                 onDeleteList={(publicListId) => {
                                   setSelectedPublicListId(publicListId);
                                   openModal("DELETE_LIST");
                                 }}
                                 onVirtualAddCard={() =>
                                   handleVirtualAddCard(
                                     list.publicId,
                                   )
                                 }
                                 cardCount={sortedCards.length}
                                 sortMode={sortMode}
                                 sortDir={sortDir}
                                 queryParams={queryParams}
                               >
                                <Droppable
                                  droppableId={`${list.publicId}`}
                                  type="CARD"
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className="scrollbar-track-rounded-[4px] scrollbar-thumb-rounded-[4px] scrollbar-w-[8px] z-10 h-full max-h-[calc(100vh-225px)] min-h-[2rem] overflow-y-auto pr-1 scrollbar dark:scrollbar-track-dark-100 dark:scrollbar-thumb-dark-600"
                                    >
                                      {sortedCards.map((card, cardIndex) => (
                                        <Draggable
                                          key={card.publicId}
                                          draggableId={card.publicId}
                                          index={cardIndex}
                                          isDragDisabled={!canEditCard || !!groupBy || !!sortMode}
                                        >
                                        {(provided) => (
                                          <div
                                            onClick={() => {
                                              if (
                                                !card.publicId.startsWith(
                                                  "PLACEHOLDER",
                                                )
                                              ) {
                                                handleOpenCard(card.publicId);
                                              }
                                            }}
                                            onContextMenu={(e) => {
                                              if (
                                                card.publicId.startsWith(
                                                  "PLACEHOLDER",
                                                ) ||
                                                env("NEXT_PUBLIC_KAN_ENV") ===
                                                  "cloud"
                                              )
                                                return;
                                              e.preventDefault();
                                              setContextMenu({
                                                x: e.clientX,
                                                y: e.clientY,
                                                cardPublicId: card.publicId,
                                              });
                                            }}
                                            key={card.publicId}
                                            className={`mb-2 flex !cursor-pointer flex-col ${
                                              card.publicId.startsWith(
                                                "PLACEHOLDER",
                                              )
                                                ? "pointer-events-none"
                                                : ""
                                            }`}
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                          >
                                            <Card
                                              title={card.title}
                                              properties={card.properties.filter((p) => starredGroupIds.has(p.groupId))}
                                              members={card.members}
                                              checklists={card.checklists ?? []}
                                              description={
                                                card.description ?? null
                                              }
                                              comments={card.comments ?? []}
                                              attachments={card.attachments}
                                              docs={card.docs}
                                              dueDate={card.dueDate ?? null}
                                              listColourCode={isGroupByMode ? list.colourCode : undefined}
                                              listName={isGroupByMode ? cardListNameMap.get(card.publicId) : undefined}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                             </List>
                            );
                          })}
                          <div className="min-w-[0.75rem]" />
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                );
              })()}
            </>
          ) : null}
        </div>
        {contextMenu && (
          <CardContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onAction={handleCardContextMenuAction}
            canEdit={!!canEditCard}
          />
        )}
        {renderModalContent()}
        <CardSlideOver
          mode={slideOverState.mode === "add" ? "add" : "view"}
          cardPublicId={slideOverState.mode === "view" ? slideOverState.cardPublicId : undefined}
          isOpen={slideOverState.mode !== "closed"}
          onClose={slideOverState.mode === "add" ? () => setSlideOverState({ mode: "closed" }) : handleCloseCard}
          isTemplate={isTemplate}
          boardPublicId={slideOverState.mode === "add" ? boardId ?? "" : undefined}
          listPublicId={slideOverState.mode === "add" ? slideOverState.listPublicId : undefined}
          queryParams={slideOverState.mode === "add" ? queryParams : undefined}
          preSelectedLabelId={slideOverState.mode === "add" ? slideOverState.preSelectedLabelId : undefined}
          preSelectedMemberId={slideOverState.mode === "add" ? slideOverState.preSelectedMemberId : undefined}
          preSelectedDueDate={slideOverState.mode === "add" ? slideOverState.preSelectedDueDate : undefined}
          preSelectedPropertyId={slideOverState.mode === "add" ? slideOverState.preSelectedPropertyId : undefined}
        />
      </div>
    </>
  );
}
