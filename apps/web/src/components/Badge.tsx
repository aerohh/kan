import { useTheme } from "next-themes";
import type { ReactNode } from "react";

import { resolveColour } from "@kan/shared/constants";

const base =
  "inline-flex w-fit items-center justify-center rounded-full border-2 px-3 pb-2.5 pt-2 text-[10px] font-medium leading-none text-neutral-600 dark:text-dark-1000";

const notionBase =
  "inline-flex h-5 max-w-[120px] items-center truncate rounded px-1.5 text-[11px] font-medium leading-none text-neutral-600 dark:text-dark-1000";

const Badge = ({
  value,
  iconLeft,
  colourCode,
  variant = "default",
}: {
  value: string;
  iconLeft?: ReactNode;
  colourCode?: string | null;
  variant?: "default" | "compact" | "notion";
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const resolved = resolveColour(colourCode, isDark);
  const compact = variant === "compact" ? "scale-[0.85] origin-left" : "";

  if (variant === "notion" && colourCode) {
    return (
      <span
        className={notionBase}
        style={{
          backgroundColor: `${resolved}25`,
          color: resolved,
        }}
      >
        {value}
      </span>
    );
  }

  if (colourCode) {
    return (
      <span
        className={`${base} ${compact}`}
        style={{
          backgroundColor: `${resolved}25`,
          borderColor: `${resolved}30`,
        }}
      >
        {value}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span className={`${base} gap-x-1 ring-1 ring-inset ring-light-400 dark:ring-dark-700 ${compact} border-0`}>
        {iconLeft}
        <span>{value}</span>
      </span>
    );
  }

  return (
    <span className={`${base} gap-x-1 border-light-400 bg-light-400/15 dark:border-dark-700 dark:bg-dark-700/15`}>
      {iconLeft}
      <span>{value}</span>
    </span>
  );
};

export default Badge;
