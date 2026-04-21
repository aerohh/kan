import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useTheme } from "next-themes";
import { Draggable } from "react-beautiful-dnd";
import { useForm } from "react-hook-form";
import {
  HiArrowDown,
  HiArrowUp,
  HiEllipsisHorizontal,
  HiOutlinePlusSmall,
  HiOutlineSquaresPlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Dropdown from "~/components/Dropdown";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";

interface ListProps {
  children: ReactNode;
  index: number;
  list: List;
  setSelectedPublicListId: (publicListId: PublicListId) => void;
  isVirtual?: boolean;
  onVirtualAddCard?: () => void;
  cardCount?: number;
  sortMode?: string;
  sortDir?: "asc" | "desc";
}

interface List {
  publicId: string;
  name: string;
  createdBy?: string | null;
  colourCode?: string | null;
}

interface FormValues {
  listPublicId: string;
  name: string;
}

type PublicListId = string;

export default function List({
  children,
  index,
  list,
  setSelectedPublicListId,
  isVirtual = false,
  onVirtualAddCard,
  cardCount,
  sortMode,
  sortDir = "asc",
}: ListProps) {
  const router = useRouter();
  const { openModal } = useModal();
  const { resolvedTheme } = useTheme();
  const { canCreateCard, canEditList, canDeleteList } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = list.createdBy && session?.user.id === list.createdBy;
  const canEdit = !isVirtual && (canEditList || isCreator);
  const canDrag = !isVirtual && (canEditList || isCreator);
  const isDark = resolvedTheme === "dark";

  const openNewCardForm = (publicListId: PublicListId) => {
    if (!canCreateCard) return;
    openModal("NEW_CARD");
    setSelectedPublicListId(publicListId);
  };

  const updateList = api.list.update.useMutation();

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      listPublicId: list.publicId,
      name: list.name,
    },
    values: {
      listPublicId: list.publicId,
      name: list.name,
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!canEdit) return;
    updateList.mutate({
      listPublicId: values.listPublicId,
      name: values.name,
    });
  };

  const handleOpenDeleteListConfirmation = () => {
    setSelectedPublicListId(list.publicId);
    openModal("DELETE_LIST");
  };

  const toggleSortDirection = async () => {
    const newDir = sortDir === "asc" ? "desc" : "asc";
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, sortDir: newDir },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const bgStyle = isVirtual && list.colourCode
    ? {
        backgroundColor: isDark
          ? `color-mix(in srgb, color-mix(in srgb, ${list.colourCode} 40%, white) 12%, transparent)`
          : `${list.colourCode}20`,
        ...(isDark && { border: 'none' }),
      }
    : undefined;

  return (
    <Draggable
      key={list.publicId}
      draggableId={list.publicId}
      index={index}
      isDragDisabled={!canDrag}
    >
      {(provided) => (
        <div
          key={list.publicId}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={bgStyle}
          className="group dark-text-dark-1000 mr-5 h-fit min-w-[22rem] max-w-[22rem] rounded-md border border-light-400 bg-light-300 py-2 pl-2 pr-1 text-neutral-900 dark:border-dark-300 dark:bg-dark-100"
        >
          <div className="mb-2 flex items-center justify-between">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full focus-visible:outline-none"
            >
              <input
                id="name"
                type="text"
                {...register("name")}
                onBlur={handleSubmit(onSubmit)}
                readOnly={!canEdit}
                className="w-full border-0 bg-transparent px-4 pt-1 text-sm font-medium text-neutral-900 focus:ring-0 focus-visible:outline-none dark:text-dark-1000"
              />
            </form>
            <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
              {sortMode && (
                <button
                  className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 dark:hover:bg-dark-200"
                  onClick={toggleSortDirection}
                >
                  <span className="flex items-center">
                    <HiArrowUp
                      className={`${sortDir === "asc" ? "h-4 w-4" : "h-3 w-3"} ${sortDir === "asc" ? "text-light-1000 dark:text-white" : "text-dark-900"}`}
                      aria-hidden="true"
                    />
                    <HiArrowDown
                      className={`${sortDir === "desc" ? "h-4 w-4" : "h-3 w-3"} ${sortDir === "desc" ? "text-light-1000 dark:text-white" : "text-dark-900"}`}
                      aria-hidden="true"
                    />
                  </span>
                </button>
              )}
              {!isVirtual && (() => {
                const dropdownItems = [
                  ...(canCreateCard
                    ? [
                        {
                          label: t`Add a card`,
                          action: () => openNewCardForm(list.publicId),
                          icon: (
                            <HiOutlineSquaresPlus className="h-[18px] w-[18px] text-dark-900" />
                          ),
                        },
                      ]
                    : []),
                  ...(canDeleteList || isCreator
                    ? [
                        {
                          label: t`Delete list`,
                          action: handleOpenDeleteListConfirmation,
                          icon: (
                            <HiOutlineTrash className="h-[18px] w-[18px] text-dark-900" />
                          ),
                        },
                      ]
                    : []),
                ];

                if (dropdownItems.length === 0) {
                  return null;
                }

                return (
                  <div className="relative mr-1 inline-block">
                    <Dropdown items={dropdownItems}>
                      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
                    </Dropdown>
                  </div>
                );
              })()}
              <Tooltip
                content={
                  !canCreateCard ? t`You don't have permission` : undefined
                }
              >
                <button
                  className="mx-1 inline-flex h-fit items-center rounded-md p-1 px-1 text-sm font-semibold text-dark-50 hover:bg-light-400 disabled:opacity-60 disabled:cursor-not-allowed dark:hover:bg-dark-200"
                  onClick={() => {
                    if (isVirtual && onVirtualAddCard) {
                      onVirtualAddCard();
                    } else {
                      openNewCardForm(list.publicId);
                    }
                  }}
                  disabled={!canCreateCard}
                >
                  <HiOutlinePlusSmall
                    className="h-5 w-5 text-dark-900"
                    aria-hidden="true"
                  />
                </button>
              </Tooltip>
            </div>
            {cardCount !== undefined && (
              <span className="mr-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-light-400 px-1.5 text-xs font-medium text-neutral-500 dark:bg-dark-200 dark:text-dark-800">
                {cardCount}
              </span>
            )}
          </div>
          {children}
        </div>
      )}
    </Draggable>
  );
}
