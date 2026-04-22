import { HiArrowUp, HiArrowDown } from "react-icons/hi2";

import type { SortColumn, SortDir } from "./types";

interface SheetViewHeaderProps {
  sortColumn: SortColumn | null;
  sortDir: SortDir;
  onSort: (col: SortColumn) => void;
}

function SortIcon({
  col,
  sortColumn,
  sortDir,
}: {
  col: SortColumn;
  sortColumn: SortColumn | null;
  sortDir: SortDir;
}) {
  if (sortColumn !== col) return null;
  return sortDir === "asc" ? (
    <HiArrowUp className="ml-1 inline h-3 w-3" />
  ) : (
    <HiArrowDown className="ml-1 inline h-3 w-3" />
  );
}

export default function SheetViewHeader({
  sortColumn,
  sortDir,
  onSort,
}: SheetViewHeaderProps) {
  const thBase =
    "border-r border-light-500 px-4 py-2.5 dark:border-dark-400";
  const thSortable = `${thBase} cursor-pointer select-none`;

  return (
    <thead>
      <tr className="sticky top-0 z-10 border-b border-light-500 bg-light-200 text-left text-[11px] font-semibold uppercase tracking-wider text-light-800 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-800">
        <th className={thSortable} onClick={() => onSort("title")}>
          <span className="inline-flex items-center">
            Title
            <SortIcon col="title" sortColumn={sortColumn} sortDir={sortDir} />
          </span>
        </th>
        <th className={`${thBase} text-center`}>List</th>
        <th className={`${thBase} text-center`}>Labels</th>
        <th className={`${thBase} text-center`}>Members</th>
        <th className={`${thSortable} text-center`} onClick={() => onSort("dueDate")}>
          <span className="inline-flex items-center">
            Due Date
            <SortIcon col="dueDate" sortColumn={sortColumn} sortDir={sortDir} />
          </span>
        </th>
        <th className="cursor-pointer select-none px-4 py-2.5 text-center" onClick={() => onSort("progress")}>
          <span className="inline-flex items-center">
            Progress
            <SortIcon col="progress" sortColumn={sortColumn} sortDir={sortDir} />
          </span>
        </th>
      </tr>
    </thead>
  );
}
