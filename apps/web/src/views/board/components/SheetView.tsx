import { useRouter } from "next/router";
import { useTheme } from "next-themes";
import { t } from "@lingui/core/macro";
import { useState, useMemo, Fragment } from "react";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import { usePopup } from "~/providers/popup";
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
  addOrRemoveLabel,
  addOrRemoveMember,
  handleUpdateDueDate,
  groupColourCode,
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
  addOrRemoveLabel: ReturnType<typeof api.card.addOrRemoveLabel>["mutate"];
  addOrRemoveMember: ReturnType<typeof api.card.addOrRemoveMember>["mutate"];
  handleUpdateDueDate: (id: string, date: Date | null) => void;
  groupColourCode?: string | null;
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
    : "border-b border-light-400 bg-light-50 transition-colors last:border-b-0 hover:bg-light-200/70 dark:border-dark-300 dark:bg-dark-50 dark:hover:bg-dark-200/70";

  const cellBorderStyle = groupColourCode
    ? getGroupBorderStyle(groupColourCode, isDark)
    : undefined;

  const tdBorderClass = groupColourCode
    ? "border-r"
    : "border-r border-light-400 dark:border-dark-300";

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
        groupBorderStyle={cellBorderStyle}
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
        <CheckboxDropdown
          items={boardLabels.map((label) => ({
            key: label.publicId,
            value: label.name,
            selected: card.labels.some(
              (l) => l.publicId === label.publicId,
            ),
            leftIcon: (
              <LabelIcon colourCode={label.colourCode} />
            ),
          }))}
          handleSelect={(_, item) => {
            addOrRemoveLabel({
              cardPublicId: card.publicId,
              labelPublicId: item.key,
            });
          }}
          disabled={!canEditCard}
        >
          <div className="flex cursor-pointer flex-wrap gap-1">
            {card.labels.length > 0 ? (
              card.labels.map((label, i) => (
                <Badge
                  key={`${label.publicId}-${i}`}
                  value={label.name}
                  colourCode={label.colourCode}
                  variant="compact"
                />
              ))
            ) : (
              <span className="text-light-700 dark:text-dark-700">
                &mdash;
              </span>
            )}
          </div>
        </CheckboxDropdown>
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
        groupBorderStyle={cellBorderStyle}
      />

      <SheetProgressCell
        checklists={card.checklists}
        groupBorderStyle={cellBorderStyle}
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
  isTemplate,
  onContextMenu,
  boardLabels,
  workspaceMembers,
  allLists,
  canEditCard,
  weekStartDay,
}: SheetViewProps) {
  const router = useRouter();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
    const path = isTemplate
      ? `/templates/${boardPublicId}/cards/${cardPublicId}`
      : `/cards/${cardPublicId}`;
    void router.push(path);
  };

  const invalidateBoard = async () => {
    await utils.board.byId.invalidate();
  };

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update label`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
    onSettled: invalidateBoard,
  });

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
    addOrRemoveLabel: addOrRemoveLabel.mutate,
    addOrRemoveMember: addOrRemoveMember.mutate,
    handleUpdateDueDate,
  };

  return (
    <div className="px-8 pb-8">
      <div className="overflow-auto rounded-lg border border-light-500 dark:border-dark-400">
        <table className="w-full border-collapse text-sm">
          <SheetViewHeader
            sortColumn={sortColumn}
            sortDir={sortDir}
            onSort={handleSort}
          />
          <tbody>
            {sortedGroups
              ? sortedGroups.map((group) => (
                  <Fragment key={group.name}>
                    <GroupSectionHeader group={group} isDark={isDark} />
                    {group.cards.map((card) => (
                      <CardRow
                        key={card.publicId}
                        card={card}
                        groupColourCode={group.colourCode}
                        {...rowProps}
                      />
                    ))}
                  </Fragment>
                ))
              : sorted.map((card) => (
                  <CardRow key={card.publicId} card={card} {...rowProps} />
                ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-light-500 bg-light-200 text-[12px] text-light-800 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-800">
              <td colSpan={6} className="px-4 py-2">
                {totalCount} {totalCount === 1 ? "card" : "cards"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
