import { useTheme } from "next-themes";

import { resolveColour } from "@kan/shared/constants";

const LabelIcon = ({ colourCode }: { colourCode: string | null }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const resolved = resolveColour(colourCode, isDark);

  return (
    <svg
      fill={resolved}
      className="h-1.5 w-1.5"
      viewBox="0 0 6 6"
      aria-hidden="true"
    >
      <circle cx={3} cy={3} r={3} />
    </svg>
  );
};

export default LabelIcon;
