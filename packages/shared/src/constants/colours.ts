export const colours: { name: string; code: string }[] = [
  { name: "Teal", code: "#0d9488" },
  { name: "Green", code: "#65a30d" },
  { name: "Blue", code: "#0284c7" },
  { name: "Purple", code: "#4f46e5" },
  { name: "Yellow", code: "#ca8a04" },
  { name: "Orange", code: "#ea580c" },
  { name: "Red", code: "#dc2626" },
  { name: "Pink", code: "#db2777" },
] as const;

export type Colour = (typeof colours)[number];

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
      border: "hsl(0deg 0% 98.8%)",
    },
  },
};
