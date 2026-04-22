import { getCardProgress } from "./utils";

interface SheetProgressCellProps {
  checklists: {
    items: { completed: boolean }[];
  }[];
}

export default function SheetProgressCell({ checklists }: SheetProgressCellProps) {
  const progress = getCardProgress({ checklists });

  if (progress < 0) {
    return (
      <td className="px-4 py-2.5 text-center">
        <span className="text-light-700 dark:text-dark-700">&mdash;</span>
      </td>
    );
  }

  const completedItems = checklists.reduce(
    (acc, cl) => acc + cl.items.filter((i) => i.completed).length,
    0,
  );
  const totalItems = checklists.reduce(
    (acc, cl) => acc + cl.items.length,
    0,
  );

  return (
    <td className="px-4 py-2.5 text-center">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-light-300 dark:bg-dark-400">
          <div
            className={`h-full rounded-full transition-all ${
              progress === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-light-900 dark:text-dark-950">
          {completedItems}/{totalItems}
        </span>
      </div>
    </td>
  );
}
