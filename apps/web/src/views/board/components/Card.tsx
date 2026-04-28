import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { useTheme } from "next-themes";
import { useState } from "react";
import { HiOutlinePaperClip } from "react-icons/hi";
import {
  HiBars3BottomLeft,
  HiChatBubbleLeft,
  HiDocumentText,
  HiOutlineClock,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import Avatar from "~/components/Avatar";
import Badge from "~/components/Badge";
import CircularProgress from "~/components/CircularProgress";

import { useLocalisation } from "~/hooks/useLocalisation";
import { getAvatarUrl } from "~/utils/helpers";

const Card = ({
  title,
  labels,
  members,
  checklists,
  description,
  comments,
  attachments,
  docs,
  dueDate,
  listColourCode,
  listName,
}: {
  title: string;
  labels: { name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
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
  description: string | unknown[] | null;
  comments: { publicId: string }[];
  attachments?: { publicId: string }[];
  docs?: { publicId: string }[];
  dueDate?: Date | null;
  listColourCode?: string | null;
  listName?: string;
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { dateLocale } = useLocalisation();
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;
  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
  const completedItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.filter((item) => item.completed).length;
  }, 0);

  const totalItems = checklists.reduce((acc, checklist) => {
    return acc + checklist.items.length;
  }, 0);

  const progress =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const hasDescription = (() => {
    if (description == null) return false;
    if (typeof description === "string") {
      return description.replace(/<[^>]*>/g, "").trim().length > 0;
    }
    if (!Array.isArray(description)) return false;
    return description.some((block) => {
      if (!block || typeof block !== "object") return false;
      const b = block as Record<string, unknown>;
      if (Array.isArray(b.content)) {
        if (b.content.some((inline: unknown) => {
          if (!inline || typeof inline !== "object") return false;
          const i = inline as Record<string, unknown>;
          return typeof i.text === "string" && i.text.trim().length > 0;
        })) return true;
      }
      if (Array.isArray(b.children) && b.children.length > 0) {
        const b2 = b as { children: unknown[] };
        return b2.children.some((child: unknown) => {
          if (!child || typeof child !== "object") return false;
          const c = child as Record<string, unknown>;
          if (Array.isArray(c.content)) {
            return c.content.some((inline: unknown) => {
              if (!inline || typeof inline !== "object") return false;
              const i = inline as Record<string, unknown>;
              return typeof i.text === "string" && i.text.trim().length > 0;
            });
          }
          return false;
        });
      }
      return false;
    });
  })();
  const hasDocs = docs && docs.length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasDueDate = !!dueDate;

  const cardDarkStyle =
    isDark && listColourCode
      ? {
          backgroundColor: `color-mix(in srgb, color-mix(in srgb, ${listColourCode} 35%, white) 10%, transparent)`,
          border: 'none',
        }
      : undefined;

  const cardDarkHoverStyle =
    isDark && listColourCode
      ? { backgroundColor: `color-mix(in srgb, color-mix(in srgb, ${listColourCode} 40%, white) 15%, transparent)` }
      : undefined;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={isHovered ? { ...cardDarkStyle, ...cardDarkHoverStyle } : cardDarkStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col overflow-hidden rounded-md border border-light-200 bg-light-50 px-3 py-2 text-sm text-neutral-900 dark:border-dark-200 dark:bg-dark-200 dark:text-dark-1000 dark:hover:bg-dark-300"
    >
      <span className="break-words text-[14px] font-semibold mb-2">{title}</span>
      {labels.length ||
      members.length ||
      checklists.length > 0 ||
      hasDescription ||
      hasDocs ||
      comments.length > 0 ||
      hasDueDate ||
      hasAttachments ? (
        <div className="mt-2 flex flex-col justify-end">
          <div className="flex flex-wrap gap-1 max-h-[44px] overflow-hidden">
            {labels.map((label, index) => (
              <Badge
                key={`${label.name}-${index}`}
                value={label.name}
                colourCode={label.colourCode}
                variant="notion"
              />
            ))}
          </div>
          {listName && (
            <span className="mt-2.5 inline-block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-600 rounded px-1.5 py-0.5 max-w-fit truncate">{listName}</span>
          )}
          <div className="mt-2 flex items-center justify-between gap-1">
            <div className="flex items-center gap-2">
              {hasDocs ? (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiDocumentText className="h-4 w-4" />
                </div>
              ) : hasDescription ? (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiBars3BottomLeft className="h-4 w-4" />
                </div>
              ) : null}
              {hasDueDate && dueDate && (
                <div
                  className={twMerge(
                    "flex items-center gap-1",
                    isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-light-800 dark:text-dark-800",
                  )}
                >
                  <HiOutlineClock className="h-4 w-4" />
                  <span className="text-[11px]">
                    {format(dueDate, showYear ? "do MMM yyyy" : "do MMM", {
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              )}
              {comments.length > 0 && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiChatBubbleLeft className="h-4 w-4" />
                </div>
              )}
              {hasAttachments && (
                <div className="flex items-center gap-1 text-light-700 dark:text-dark-800">
                  <HiOutlinePaperClip className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-1">
              {checklists.length > 0 && (
                <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-600">
                  <CircularProgress
                    progress={progress || 2}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <span className="text-[10px] text-light-900 dark:text-dark-950">
                    {completedItems}/{totalItems}
                  </span>
                </div>
              )}
              {members.length > 0 && (
                <div className="isolate flex justify-end -space-x-1 overflow-hidden">
                  {members.map(({ user, email }) => {
                    const avatarUrl = user?.image
                      ? getAvatarUrl(user.image)
                      : undefined;

                    return (
                      <Avatar
                        key={user?.email ?? email}
                        name={user?.name ?? ""}
                        email={user?.email ?? email}
                        imageUrl={avatarUrl}
                        size="sm"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Card;
