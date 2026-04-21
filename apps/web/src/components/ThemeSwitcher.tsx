import { useTheme } from "next-themes";
import { useCallback } from "react";
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

  const handleClick = useCallback(() => {
    const el = document.documentElement;
    el.style.transition = "transform 0.15s ease-in, opacity 0.15s ease-in";
    el.style.transform = "scale(0.97)";
    el.style.opacity = "0.5";
    el.style.transformOrigin = "bottom left";

    setTimeout(() => {
      setTheme(nextTheme);
      el.style.transition = "transform 0.25s ease-out, opacity 0.25s ease-out";
      el.style.transform = "scale(1)";
      el.style.opacity = "1";

      const cleanup = () => {
        el.style.removeProperty("transform");
        el.style.removeProperty("opacity");
        el.style.removeProperty("transition");
        el.style.removeProperty("transform-origin");
      };
      el.addEventListener("transitionend", cleanup, { once: true });
    }, 150);
  }, [nextTheme, setTheme]);

  return (
    <button
      onClick={handleClick}
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
