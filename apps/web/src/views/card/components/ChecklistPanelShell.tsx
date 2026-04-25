import { t } from "@lingui/core/macro";
import type { ReactNode } from "react";

interface ChecklistPanelShellProps {
  headerActions?: ReactNode;
  emptyState?: ReactNode;
  children: ReactNode;
}

export default function ChecklistPanelShell({
  headerActions,
  emptyState,
  children,
}: ChecklistPanelShellProps) {
  return (
    <div className="h-full min-h-0 w-[360px] overflow-y-auto border-l-[1px] border-light-300 bg-light-100 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900">
      <div className="pt-[18px]">
        <div className="flex items-center justify-between pb-4">
          <h2 className="pb-4 text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
            {t`Checklists`}
          </h2>
          {headerActions}
        </div>
        {emptyState}
        {children}
      </div>
    </div>
  );
}
