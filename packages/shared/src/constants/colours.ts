export const colours: {
  name: string;
  code: string;
  lightCode: string;
  darkCode: string;
}[] = [
  { name: "Charcoal", code: "#3f3f46", lightCode: "#3f3f46", darkCode: "#a1a1aa" },
  { name: "Sage", code: "#4d7c5c", lightCode: "#4d7c5c", darkCode: "#6fcf8a" },
  { name: "Cyan", code: "#0891b2", lightCode: "#0891b2", darkCode: "#22d3ee" },
  { name: "Sky", code: "#2563eb", lightCode: "#2563eb", darkCode: "#60a5fa" },
  { name: "Indigo", code: "#4f46e5", lightCode: "#4f46e5", darkCode: "#818cf8" },
  { name: "Violet", code: "#7c3aed", lightCode: "#7c3aed", darkCode: "#a78bfa" },
  { name: "Rose", code: "#e11d48", lightCode: "#e11d48", darkCode: "#fb7185" },
  { name: "Amber", code: "#d97706", lightCode: "#d97706", darkCode: "#fbbf24" },
] as const;

export type Colour = (typeof colours)[number];

export function resolveColour(
  code: string | null | undefined,
  isDark: boolean,
): string {
  if (!code) return isDark ? "#818cf8" : "#4f46e5";
  const match = colours.find(
    (c) => c.code === code || c.lightCode === code || c.darkCode === code,
  );
  if (match) return isDark ? match.darkCode : match.lightCode;
  return code;
}

export const themeEditor = {
  dark: {
    colors: {
      editor: { background: "#161616" },
      menu: {
        background: "#161616",
        text: "hsl(0deg 0% 72%)",
      },
      hovered: { background: "hsl(0deg 0% 20%)" },
      tooltip: {
        background: "hsl(0deg 0% 20%)",
        text: "hsl(0deg 0% 72%)",
      },
      selected: { background: "#3b82f6", text: "#ffffff" },
      border: "hsl(0deg 0% 5%)",
    },
  },
  light: {
    colors: {
      editor: { background: "hsl(0deg 0% 98.8%)" },
      menu: {
        background: "hsl(0deg 0% 98.8%)",
        text: "black",
      },
      hovered: { background: "hsl(0deg 0% 93%)" },
      tooltip: {
        background: "hsl(0deg 0% 85%)",
        text: "black",
      },
      selected: { background: "#3b82f6", text: "#ffffff" },
      border: "hsl(0deg 0% 98.8%))",
    },
  },
};
