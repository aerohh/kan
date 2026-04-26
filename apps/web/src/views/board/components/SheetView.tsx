import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { t } from "@lingui/core/macro";
import type { RouterInputs } from "@kan/api";
import { useCallback, useMemo, useRef, useState, Fragment } from "react";
import { HiOutlinePlusSmall } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import { QuickAddCardInput } from "~/components/QuickAddCardInput";
import LabelSelector from "~/views/card/components/LabelSelector";
import { usePopup } from "~/providers/popup";
import { useQuickAddCard } from "~/hooks/useQuickAddCard";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { api } from "~/utils/api";

import SheetDueDateCell from "./sheet-view/SheetDueDateCell";
import SheetProgressCell from "./sheet-view/SheetProgressCell";
import SheetTitleCell from "./sheet-view/SheetTitleCell";
import SheetViewHeader from "./sheet-view/SheetViewHeader";
import { sortCards } from "./sheet-view/utils";
import type {
  SheetViewProps,
  SheetCard,
  SheetGroup,
  SortColumn,
  SortDir,
} from "./sheet-view/types";

export type { SheetCard, SheetGroup } from "./sheet-view/types";

function getGroupBorderStyle(
  colourCode: string,
  isDark: boolean,
): React.CSSProperties {
  return {
    borderColor: isDark
      ? `color-mix(in srgb, ${colourCode} 25%, transparent)`
      : `${colourCode}35`,
  };
}

function CardRow({
  card,
  canEditCard,
  onNavigate,
  onContextMenu,
  boardLabels,
  workspaceMembers,
  allLists,
  weekStartDay,
  updateCard,
  addOrRemoveMember,
  handleUpdateDueDate,
  groupColourCode,
  rowIndex,
}: {
  card: SheetCard;
  canEditCard: boolean;
  onNavigate: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string) => void;
  boardLabels: SheetViewProps["boardLabels"];
  workspaceMembers: SheetViewProps["workspaceMembers"];
  allLists: SheetViewProps["allLists"];
  weekStartDay: number;
  updateCard: ReturnType<typeof api.card.update>["mutate"];
  addOrRemoveMember: ReturnType<typeof api.card.addOrRemoveMember>["mutate"];
  handleUpdateDueDate: (id: string, date: Date | null) => void;
  groupColourCode?: string | null;
  rowIndex: number;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const bgStyle = groupColourCode
    ? {
        backgroundColor: isDark
          ? `color-mix(in srgb, color-mix(in srgb, ${groupColourCode} 40%, white) 12%, transparent)`
          : `${groupColourCode}20`,
      }
    : undefined;

  const rowClassName = groupColourCode
    ? "border-b transition-colors last:border-b-0"
    : rowIndex % 2 === 0
      ? "border-b border-light-600 bg-light-50 transition-colors last:border-b-0 hover:bg-light-200/70 dark:border-dark-400 dark:bg-dark-50 dark:hover:bg-dark-200/70"
      : "border-b border-light-600 bg-light-100 transition-colors last:border-b-0 hover:bg-light-200/70 dark:border-dark-400 dark:bg-dark-100 dark:hover:bg-dark-200/70";

  const cellBorderStyle = groupColourCode
    ? getGroupBorderStyle(groupColourCode, isDark)
    : undefined;

  const tdBorderClass = groupColourCode
    ? "border-r"
    : "border-r border-light-600 dark:border-dark-400";

  return (
    <tr
      key={card.publicId}
      onContextMenu={(e) => onContextMenu(e, card.publicId)}
      className={rowClassName}
      style={{
        ...bgStyle,
        ...(groupColourCode
          ? { borderColor: cellBorderStyle?.borderColor }
          : undefined),
      }}
    >
      <SheetTitleCell
        cardPublicId={card.publicId}
        title={card.title}
        canEditCard={canEditCard}
        onNavigate={onNavigate}
        borderClassName={tdBorderClass}
        borderStyle={cellBorderStyle}
      />

      <td
        className={`${tdBorderClass} px-4 py-2.5 text-center`}
        style={cellBorderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full justify-center">
          <div className="w-auto">
            <CheckboxDropdown
              items={allLists.map((list) => ({
                key: list.publicId,
                value: list.name,
                selected: list.publicId === card.listPublicId,
              }))}
              handleSelect={(_, item) => {
                updateCard({
                  cardPublicId: card.publicId,
                  listPublicId: item.key,
                  index: 0,
                });
              }}
              disabled={!canEditCard}
            >
              <span className="inline-block cursor-pointer rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400">
                {card.listName}
              </span>
            </CheckboxDropdown>
          </div>
        </div>
      </td>

      <td
        className={`${tdBorderClass} px-4 py-2.5`}
        style={cellBorderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <LabelSelector
          cardPublicId={card.publicId}
          labels={boardLabels.map((label) => {
            const isSelected = card.labels.some(
              (l) => l.publicId === label.publicId,
            );
            return {
              key: label.publicId,
              value: label.name,
              selected: isSelected,
              leftIcon: <LabelIcon colourCode={label.colourCode} />,
              colourCode: label.colourCode,
            };
          })}
          isLoading={false}
          disabled={!canEditCard}
        />
      </td>

      <td
        className={`${tdBorderClass} px-4 py-2.5 text-center`}
        style={cellBorderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <CheckboxDropdown
          items={workspaceMembers.map((member) => ({
            key: member.publicId,
            value: formatMemberDisplayName(
              member.user?.name ?? null,
              member.user?.email ?? member.email,
            ),
            selected: card.members.some(
              (m) => m.publicId === member.publicId,
            ),
            leftIcon: (
              <Avatar
                name={member.user?.name ?? ""}
                email={member.user?.email ?? member.email}
                imageUrl={
                  member.user?.image
                    ? getAvatarUrl(member.user.image)
                    : undefined
                }
                size="xs"
              />
            ),
          }))}
          handleSelect={(_, item) => {
            addOrRemoveMember({
              cardPublicId: card.publicId,
              workspaceMemberPublicId: item.key,
            });
          }}
          disabled={!canEditCard}
        >
          <div className="flex cursor-pointer justify-center -space-x-1">
            {card.members.length > 0 ? (
              card.members.map(({ user, email }) => {
                const avatarUrl = user?.image
                  ? getAvatarUrl(user.image)
                  : undefined;
                return (
                  <Avatar
                    key={email}
                    name={user?.name ?? ""}
                    email={user?.email ?? email}
                    imageUrl={avatarUrl}
                    size="xs"
                  />
                );
              })
            ) : (
              <span className="text-light-700 dark:text-dark-700">
                &mdash;
              </span>
            )}
          </div>
        </CheckboxDropdown>
      </td>

      <SheetDueDateCell
        cardPublicId={card.publicId}
        dueDate={card.dueDate}
        canEditCard={canEditCard}
        weekStartDay={weekStartDay}
        onUpdateDueDate={handleUpdateDueDate}
        borderClassName={tdBorderClass}
        borderStyle={cellBorderStyle}
      />

      <SheetProgressCell
        checklists={card.checklists}
        borderClassName={undefined}
        borderStyle={cellBorderStyle}
      />
    </tr>
  );
}

function GroupSectionHeader({
  group,
  isDark,
}: {
  group: SheetGroup;
  isDark: boolean;
}) {
  const borderStyle = group.colourCode
    ? { borderColor: isDark
        ? `color-mix(in srgb, ${group.colourCode} 25%, transparent)`
        : `${group.colourCode}35` }
    : undefined;

  return (
    <tr className="border-b" style={borderStyle}>
      <td
        colSpan={6}
        className="flex items-center gap-2 bg-light-200/80 px-4 py-2 dark:bg-dark-200/80"
        style={borderStyle}
      >
        {group.colourCode && (
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: group.colourCode }}
          />
        )}
        <span className="text-[12px] font-semibold text-light-1000 dark:text-dark-1000">
          {group.name}
        </span>
        <span className="text-[11px] text-light-800 dark:text-dark-800">
          {group.cards.length}
        </span>
      </td>
    </tr>
  );
}

export default function SheetView({
  cards,
  groups,
  boardPublicId,
  isTemplate: _isTemplate,
  onContextMenu,
  onOpenCard,
  boardLabels,
  workspaceMembers,
  allLists,
  canEditCard,
  weekStartDay,
  canCreateCard,
}: SheetViewProps) {
  const router = useRouter();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [focusCount, setFocusCount] = useState(0);
  const quickAddRef = useRef<HTMLTextAreaElement>(null);

  const firstListId = allLists[0]?.publicId ?? "";
  const queryParams: RouterInputs["board"]["byId"] = {
    boardPublicId,
  };

  const { createCard: quickCreateCard, isPending: isQuickAddPending } =
    useQuickAddCard(queryParams);

  const handleQuickAddSubmit = useCallback(() => {
    const trimmed = quickAddTitle.trim();
    if (!trimmed || !firstListId) return;
    quickCreateCard(trimmed, firstListId);
    setQuickAddTitle("");
    setFocusCount((c) => c + 1);
  }, [quickAddTitle, firstListId, quickCreateCard]);

  const handleQuickAddCancel = useCallback(() => {
    setShowQuickAdd(false);
    setQuickAddTitle("");
  }, []);

  const sorted = useMemo(
    () => sortCards(cards, sortColumn, sortDir),
    [cards, sortColumn, sortDir],
  );

  const sortedGroups = useMemo(() => {
    if (!groups) return null;
    return groups.map((g) => ({
      ...g,
      cards: sortCards(g.cards, sortColumn, sortDir),
    }));
  }, [groups, sortColumn, sortDir]);

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDir("asc");
    }
  };

  const handleTitleClick = (cardPublicId: string) => {
    if (onOpenCard) {
      onOpenCard(cardPublicId);
    } else {
      void router.push(
        { pathname: router.pathname, query: { ...router.query, card: cardPublicId } },
        undefined,
        { shallow: true },
      );
    }
  };

  const invalidateBoard = async () => {
    await utils.board.byId.invalidate();
  };

  const addOrRemoveMember = api.card.addOrRemoveMember.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update member`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
    onSettled: invalidateBoard,
  });

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
    onSettled: invalidateBoard,
  });

  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-20">
        <p className="text-[14px] text-light-900 dark:text-dark-900">
          No cards to display
        </p>
      </div>
    );
  }

  const handleUpdateDueDate = (cardPublicId: string, date: Date | null) => {
    updateCard.mutate({ cardPublicId, dueDate: date });
  };

  const totalCount = sortedGroups
    ? sortedGroups.reduce((sum, g) => sum + g.cards.length, 0)
    : sorted.length;

  const rowProps = {
    canEditCard,
    onNavigate: handleTitleClick,
    onContextMenu,
    boardLabels,
    workspaceMembers,
    allLists,
    weekStartDay,
    updateCard: updateCard.mutate,
    addOrRemoveMember: addOrRemoveMember.mutate,
    handleUpdateDueDate,
  };

  return (
    <div className="flex h-full flex-col px-8 pb-8">
      {canCreateCard && (
        <div className="mb-3 flex items-center justify-end">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              showQuickAdd
                ? "bg-light-300 text-light-900 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-900 dark:hover:bg-dark-400"
                : "text-light-800 hover:bg-light-200 hover:text-light-900 dark:text-dark-800 dark:hover:bg-dark-200 dark:hover:text-dark-900"
            }`}
          >
            <HiOutlinePlusSmall className={`h-3.5 w-3.5 transition-transform ${showQuickAdd ? "rotate-45" : ""}`} />
            {showQuickAdd ? t`Done` : t`New card`}
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <div className="max-h-full overflow-auto rounded-lg border border-light-500 dark:border-dark-400">
          <table className="w-full border-collapse text-sm">
          <SheetViewHeader
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
          />
          <tbody>
            {showQuickAdd && (
              <tr className="border-b border-light-600 bg-blue-50/30 transition-colors dark:border-dark-400 dark:bg-blue-900/5">
                <td className="border-r border-light-600 py-2 pl-4 pr-3 dark:border-dark-400">
                  <QuickAddCardInput
                    ref={quickAddRef}
                    value={quickAddTitle}
                    onChange={setQuickAddTitle}
                    onSubmit={handleQuickAddSubmit}
                    onCancel={handleQuickAddCancel}
                    focusCount={focusCount}
                    placeholder={t`Enter a title...`}
                    disabled={isQuickAddPending}
                    className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm text-neutral-900 placeholder:text-light-600 focus:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-600"
                  />
                </td>
                <td className="border-r border-light-600 px-4 py-2.5 text-center dark:border-dark-400">
                  <span className="inline-block rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-dark-300 dark:text-dark-800">
                    {allLists[0]?.name ?? "—"}
                  </span>
                </td>
                <td className="border-r border-light-600 px-4 py-2.5 text-center dark:border-dark-400">
                  <span className="text-light-500 dark:text-dark-600">&mdash;</span>
                </td>
                <td className="border-r border-light-600 px-4 py-2.5 text-center dark:border-dark-400">
                  <span className="text-light-500 dark:text-dark-600">&mdash;</span>
                </td>
                <td className="border-r border-light-600 px-4 py-2.5 text-center dark:border-dark-400">
                  <span className="text-light-500 dark:text-dark-600">&mdash;</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="text-light-500 dark:text-dark-600">&mdash;</span>
                </td>
              </tr>
            )}
            {sortedGroups
              ? sortedGroups.map((group) => (
                  <Fragment key={group.name}>
                    <GroupSectionHeader group={group} isDark={isDark} />
                    {group.cards.map((card, index) => (
                      <CardRow
                        key={card.publicId}
                        card={card}
                        groupColourCode={group.colourCode}
                        rowIndex={index}
                        {...rowProps}
                      />
                    ))}
                  </Fragment>
                ))
              : sorted.map((card, index) => (
                  <CardRow key={card.publicId} card={card} rowIndex={index} {...rowProps} />
                ))}
          </tbody>
          <tfoot>
            <tr className="sticky bottom-0 z-10 border-t border-light-500 bg-light-200 text-[12px] text-light-800 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-800">
              <td colSpan={6} className="px-4 py-2">
                {totalCount} {totalCount === 1 ? "card" : "cards"}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
}
