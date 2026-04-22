import { useState, useRef, useEffect } from "react";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";

import { api } from "~/utils/api";
import { usePopup } from "~/providers/popup";
import { t } from "@lingui/core/macro";

interface SheetTitleCellProps {
  cardPublicId: string;
  title: string;
  canEditCard: boolean;
  onNavigate: (cardPublicId: string) => void;
  onUpdated?: () => void;
  groupBorderStyle?: React.CSSProperties;
}

export default function SheetTitleCell({
  cardPublicId,
  title,
  canEditCard,
  onNavigate,
  onUpdated,
  groupBorderStyle,
}: SheetTitleCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const updateCard = api.card.update.useMutation({
    onError: () => {
      showPopup({
        header: t`Unable to update card`,
        message: t`Please try again later.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate();
      onUpdated?.();
    },
  });

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== title) {
      updateCard.mutate({ cardPublicId, title: trimmed });
    } else {
      setDraft(title);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditCard) return;
    setDraft(title);
    setEditing(true);
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate(cardPublicId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    } else if (e.key === "Escape") {
      setDraft(title);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <td
        className={`max-w-[300px] border-r px-4 py-2.5${groupBorderStyle ? "" : " border-light-400 dark:border-dark-300"}`}
        style={groupBorderStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className="w-full border-0 bg-transparent p-0 text-sm font-medium text-neutral-900 focus:ring-0 focus:outline-none dark:text-dark-1000"
        />
      </td>
    );
  }

  return (
    <td
      className={`group/title relative w-[300px] max-w-[300px] cursor-pointer border-r px-4 py-2.5 font-medium text-neutral-900${groupBorderStyle ? "" : " border-light-400 dark:border-dark-300"} dark:text-dark-1000`}
      style={groupBorderStyle}
      onClick={handleClick}
    >
      <div className="overflow-hidden whitespace-nowrap text-ellipsis pr-0 group-hover/title:pr-16">{title}</div>
      <div className="pointer-events-none group-hover/title:pointer-events-auto absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded bg-light-200 px-2 py-1 text-[11px] text-light-800 opacity-0 transition-opacity hover:bg-light-300 group-hover/title:opacity-100 dark:bg-dark-200 dark:text-dark-800 dark:hover:bg-dark-300">
        <button
          type="button"
          onClick={handleOpenClick}
          className="flex items-center gap-1.5"
        >
          <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5" />
          Open
        </button>
      </div>
    </td>
  );
}
