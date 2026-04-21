import { useTheme } from "next-themes";
import { HiSun, HiMoon } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface ThemeSwitcherProps {
  isCollapsed?: boolean;
}

export default function ThemeSwitcher({ isCollapsed = false }: ThemeSwitcherProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";

  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      className={twMerge(
        "flex items-center justify-center rounded-md p-1 transition-all duration-300 hover:bg-light-200 dark:hover:bg-dark-200",
        isDark
          ? "text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.7)]"
                  : "text-amber-500 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]",
      )}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {isDark ? (
        <HiMoon className="h-5 w-5 text-indigo-400 drop-shadow-[0_0_20px_rgba(129,140,248,0.9)]" />
      ) : (
        <HiSun className="h-[22px] w-[22px] text-amber-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.9)]" />
      )}
    </button>
  );
}
