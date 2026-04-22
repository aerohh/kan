import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { useState } from "react";
import { HiOutlineClock } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import DateSelector from "~/components/DateSelector";
import LabelIcon from "~/components/LabelIcon";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePopup } from "~/providers/popup";
import { formatMemberDisplayName, getAvatarUrl } from "~/utils/helpers";
import { api } from "~/utils/api";

export interface SheetCard {
  publicId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: { publicId: string; name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
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
  listName: string;
  listPublicId: string;
}

interface SheetViewProps {
  cards: SheetCard[];
  boardPublicId: string;
  isTemplate: boolean;
  onContextMenu: (e: React.MouseEvent, cardPublicId: string) => void;
  boardLabels: { publicId: string; name: string; colourCode: string | null }[];
  workspaceMembers: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  allLists: { publicId: string; name: string }[];
  canEditCard: boolean;
  weekStartDay: number;
}

export default function SheetView({
  cards,
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
  const { dateLocale } = useLocalisation();
  const { showPopup } = usePopup();
  const utils = api.useUtils();
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null);

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

  return (
    <div className="px-8 pb-8">
      <div className="overflow-hidden rounded-lg border border-light-500 dark:border-dark-400">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-light-500 bg-light-200 text-left text-[11px] font-semibold uppercase tracking-wider text-light-800 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-800">
              <th className="border-r border-light-500 px-4 py-2.5 dark:border-dark-400">Title</th>
              <th className="border-r border-light-500 px-4 py-2.5 text-center dark:border-dark-400">List</th>
              <th className="border-r border-light-500 px-4 py-2.5 text-center dark:border-dark-400">Labels</th>
              <th className="border-r border-light-500 px-4 py-2.5 text-center dark:border-dark-400">Members</th>
              <th className="border-r border-light-500 px-4 py-2.5 text-center dark:border-dark-400">Due Date</th>
              <th className="px-4 py-2.5 text-center">Progress</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const isOverdue = card.dueDate
                ? isBefore(card.dueDate, startOfDay(new Date()))
                : false;
              const showYear = card.dueDate
                ? !isSameYear(card.dueDate, new Date())
                : false;

              const completedItems = card.checklists.reduce(
                (acc, cl) => acc + cl.items.filter((i) => i.completed).length,
                0,
              );
              const totalItems = card.checklists.reduce(
                (acc, cl) => acc + cl.items.length,
                0,
              );
              const progress =
                totalItems > 0
                  ? Math.round((completedItems / totalItems) * 100)
                  : 0;

              return (
                <tr
                  key={card.publicId}
                  onContextMenu={(e) => onContextMenu(e, card.publicId)}
                  className="border-b border-light-400 bg-light-50 transition-colors last:border-b-0 hover:bg-light-200/70 dark:border-dark-300 dark:bg-dark-50 dark:hover:bg-dark-200/70"
                >
                  <td
                    className="max-w-[300px] cursor-pointer truncate border-r border-light-400 px-4 py-2.5 font-medium text-neutral-900 dark:border-dark-300 dark:text-dark-1000"
                    onClick={() => handleTitleClick(card.publicId)}
                  >
                    {card.title}
                  </td>

                  <td
                    className="border-r border-light-400 px-4 py-2.5 text-center dark:border-dark-300"
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
                            updateCard.mutate({
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
                    className="border-r border-light-400 px-4 py-2.5 dark:border-dark-300"
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
                        addOrRemoveLabel.mutate({
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
                            —
                          </span>
                        )}
                      </div>
                    </CheckboxDropdown>
                  </td>

                  <td
                    className="border-r border-light-400 px-4 py-2.5 text-center dark:border-dark-300"
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
                        addOrRemoveMember.mutate({
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
                            —
                          </span>
                        )}
                      </div>
                    </CheckboxDropdown>
                  </td>

                  <td
                    className="relative border-r border-light-400 px-4 py-2.5 text-center dark:border-dark-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() =>
                        canEditCard && setEditingDueDate(card.publicId)
                      }
                      disabled={!canEditCard}
                    >
                      {card.dueDate ? (
                        <div
                          className={`flex items-center gap-1 ${
                            isOverdue
                              ? "text-red-600 dark:text-red-400"
                              : "text-light-800 dark:text-dark-800"
                          }`}
                        >
                          <HiOutlineClock className="h-3.5 w-3.5" />
                          <span className="text-xs">
                            {format(
                              card.dueDate,
                              showYear ? "do MMM yyyy" : "do MMM",
                              { locale: dateLocale },
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-light-700 dark:text-dark-700">
                          —
                        </span>
                      )}
                    </button>
                    {editingDueDate === card.publicId && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setEditingDueDate(null)}
                        />
                        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 rounded-lg border border-light-400 bg-light-50 p-2 shadow-lg dark:border-dark-300 dark:bg-dark-50">
                          <DateSelector
                            selectedDate={card.dueDate}
                            onDateSelect={(date) => {
                              updateCard.mutate({
                                cardPublicId: card.publicId,
                                dueDate: date ?? null,
                              });
                              setEditingDueDate(null);
                            }}
                            weekStartsOn={weekStartDay as 0 | 1 | 6}
                          />
                        </div>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-2.5 text-center">
                    {card.checklists.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-light-300 dark:bg-dark-400">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progress === 100
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-light-900 dark:text-dark-950">
                          {completedItems}/{totalItems}
                        </span>
                      </div>
                    ) : (
                      <span className="text-light-700 dark:text-dark-700">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
