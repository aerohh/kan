import { t } from "@lingui/core/macro";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import DateSelector from "~/components/DateSelector";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface DueDateSelectorProps {
  cardPublicId: string;
  dueDate: Date | null | undefined;
  isLoading?: boolean;
  disabled?: boolean;
}

export function DueDateSelector({
  cardPublicId,
  dueDate,
  isLoading = false,
  disabled = false,
}: DueDateSelectorProps) {
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null | undefined>(
    dueDate,
  );

  // Sync pendingDate with dueDate when it changes externally
  useEffect(() => {
    if (!isOpen) {
      setPendingDate(dueDate);
    }
  }, [dueDate, isOpen]);

  const updateDueDate = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          dueDate:
            update.dueDate !== undefined
              ? (update.dueDate as Date | null)
              : oldCard.dueDate,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update due date`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const handleDateSelect = (date: Date | undefined) => {
    // Only update local state, don't fire mutation
    setPendingDate(date ?? null);
  };

  const handleBackdropClick = () => {
    // Only fire mutation if date actually changed
    const pendingIsNull = pendingDate === null || pendingDate === undefined;
    const dueIsNull = dueDate === null || dueDate === undefined;

    let dateChanged = false;
    if (pendingIsNull && !dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && dueIsNull) {
      dateChanged = true;
    } else if (!pendingIsNull && !dueIsNull) {
      // Both are non-null at this point
      if (pendingDate instanceof Date && dueDate instanceof Date) {
        dateChanged = pendingDate.getTime() !== dueDate.getTime();
      }
    }

    // Close popover immediately
    setIsOpen(false);

    // Fire mutation if date changed (optimistic update will handle UI)
    if (dateChanged) {
      updateDueDate.mutate({
        cardPublicId,
        dueDate: pendingDate ?? null,
      });
    }
  };

  return (
    <div className="relative inline-flex items-center text-left">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={isLoading || disabled}
        className={`inline-flex h-6 cursor-pointer items-center rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {dueDate ? (
          <span>{format(dueDate, "MMM d, yyyy")}</span>
        ) : (
          <span>{t`Due date`}</span>
        )}
      </button>
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={handleBackdropClick} />
          <div
            className="absolute -left-8 top-full z-20 mt-2 rounded-md border border-light-200 bg-light-50 shadow-lg dark:border-dark-200 dark:bg-dark-100"
            onClick={(e) => {
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
          >
            <DateSelector
              selectedDate={pendingDate ?? undefined}
              onDateSelect={handleDateSelect}
              weekStartsOn={workspace.weekStartDay}
            />
          </div>
        </>
      )}
    </div>
  );
}
