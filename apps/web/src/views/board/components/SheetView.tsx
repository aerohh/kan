import { useRouter } from "next/router";
import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlineClock } from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";
import { useLocalisation } from "~/hooks/useLocalisation";
import { getAvatarUrl } from "~/utils/helpers";

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
}

interface SheetViewProps {
  cards: SheetCard[];
  boardPublicId: string;
  isTemplate: boolean;
  onContextMenu: (e: React.MouseEvent, cardPublicId: string) => void;
}

export default function SheetView({
  cards,
  boardPublicId,
  isTemplate,
  onContextMenu,
}: SheetViewProps) {
  const router = useRouter();
  const { dateLocale } = useLocalisation();

  const handleRowClick = (cardPublicId: string) => {
    const path = isTemplate
      ? `/templates/${boardPublicId}/cards/${cardPublicId}`
      : `/cards/${cardPublicId}`;
    void router.push(path);
  };

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
              <th className="border-r border-light-500 px-4 py-2.5 dark:border-dark-400">List</th>
              <th className="border-r border-light-500 px-4 py-2.5 dark:border-dark-400">Labels</th>
              <th className="border-r border-light-500 px-4 py-2.5 dark:border-dark-400">Members</th>
              <th className="border-r border-light-500 px-4 py-2.5 dark:border-dark-400">Due Date</th>
              <th className="px-4 py-2.5">Progress</th>
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
                  onClick={() => handleRowClick(card.publicId)}
                  onContextMenu={(e) => onContextMenu(e, card.publicId)}
                  className="cursor-pointer border-b border-light-400 bg-light-50 transition-colors last:border-b-0 hover:bg-light-200/70 dark:border-dark-300 dark:bg-dark-50 dark:hover:bg-dark-200/70"
                >
                  <td className="max-w-[300px] truncate border-r border-light-400 px-4 py-2.5 font-medium text-neutral-900 dark:border-dark-300 dark:text-dark-1000">
                    {card.title}
                  </td>
                  <td className="border-r border-light-400 px-4 py-2.5 dark:border-dark-300">
                    <span className="inline-block rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-dark-300 dark:text-dark-800">
                      {card.listName}
                    </span>
                  </td>
                  <td className="border-r border-light-400 px-4 py-2.5 dark:border-dark-300">
                    {card.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((label, i) => (
                          <Badge
                            key={`${label.publicId}-${i}`}
                            value={label.name}
                            colourCode={label.colourCode}
                            variant="compact"
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-light-700 dark:text-dark-700">—</span>
                    )}
                  </td>
                  <td className="border-r border-light-400 px-4 py-2.5 dark:border-dark-300">
                    {card.members.length > 0 ? (
                      <div className="flex -space-x-1">
                        {card.members.map(({ user, email }) => {
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
                        })}
                      </div>
                    ) : (
                      <span className="text-light-700 dark:text-dark-700">—</span>
                    )}
                  </td>
                  <td className="border-r border-light-400 px-4 py-2.5 dark:border-dark-300">
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
                      <span className="text-light-700 dark:text-dark-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {card.checklists.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <CircularProgress
                          progress={progress || 2}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <span className="text-[10px] text-light-900 dark:text-dark-950">
                          {completedItems}/{totalItems}
                        </span>
                      </div>
                    ) : (
                      <span className="text-light-700 dark:text-dark-700">—</span>
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
