import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { useState } from "react";
import { HiOutlineClock } from "react-icons/hi2";

import DateSelector from "~/components/DateSelector";
import { useLocalisation } from "~/hooks/useLocalisation";

interface SheetDueDateCellProps {
  cardPublicId: string;
  dueDate: Date | null;
  canEditCard: boolean;
  weekStartDay: number;
  onUpdateDueDate: (cardPublicId: string, date: Date | null) => void;
  groupBorderStyle?: React.CSSProperties;
}

export default function SheetDueDateCell({
  cardPublicId,
  dueDate,
  canEditCard,
  weekStartDay,
  onUpdateDueDate,
  groupBorderStyle,
}: SheetDueDateCellProps) {
  const { dateLocale } = useLocalisation();
  const [editing, setEditing] = useState(false);

  const isOverdue = dueDate ? isBefore(dueDate, startOfDay(new Date())) : false;
  const showYear = dueDate ? !isSameYear(dueDate, new Date()) : false;

  return (
    <td
      className={`relative border-r px-4 py-2.5 text-center${groupBorderStyle ? "" : " border-light-400 dark:border-dark-300"}`}
      style={groupBorderStyle}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => canEditCard && setEditing(true)}
        disabled={!canEditCard}
      >
        {dueDate ? (
          <div
            className={`flex items-center gap-1 ${
              isOverdue
                ? "text-red-600 dark:text-red-400"
                : "text-light-800 dark:text-dark-800"
            }`}
          >
            <HiOutlineClock className="h-3.5 w-3.5" />
            <span className="text-xs">
              {format(dueDate, showYear ? "do MMM yyyy" : "do MMM", {
                locale: dateLocale,
              })}
            </span>
          </div>
        ) : (
          <span className="text-light-700 dark:text-dark-700">&mdash;</span>
        )}
      </button>
      {editing && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setEditing(false)}
          />
          <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 rounded-lg border border-light-400 bg-light-50 p-2 shadow-lg dark:border-dark-300 dark:bg-dark-50">
            <DateSelector
              selectedDate={dueDate}
              onDateSelect={(date) => {
                onUpdateDueDate(cardPublicId, date ?? null);
                setEditing(false);
              }}
              weekStartsOn={weekStartDay as 0 | 1 | 6}
            />
          </div>
        </>
      )}
    </td>
  );
}
