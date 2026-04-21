type GlowPreset = {
  activeIconClass: string;
  inactiveIconClass: string;
  activeButtonClass: string;
};

type GlowConfig = {
  light: string;
  dark: string;
  rgb: string;
};

const INACTIVE_BASE = "text-light-800 dark:text-dark-800";

function buildPreset({ light, dark, rgb }: GlowConfig): GlowPreset {
  const color = light === dark ? light : `${light} dark:${dark}`;
  const hover =
    light === dark
      ? `group-hover/toolbar:${light}`
      : `group-hover/toolbar:${light} dark:group-hover/toolbar:${dark}`;

  return {
    activeIconClass: color,
    inactiveIconClass: `${INACTIVE_BASE} ${hover} group-hover/toolbar:[filter:drop-shadow(0_0_8px_rgba(${rgb},0.7))]`,
    activeButtonClass: `${color} [filter:drop-shadow(0_0_6px_rgba(${rgb},0.9))_drop-shadow(0_0_20px_rgba(${rgb},0.5))]`,
  };
}

export const TOOLBAR_GLOW_PRESETS: Record<string, GlowPreset> = {
  sort: buildPreset({ light: "text-fuchsia-500", dark: "text-fuchsia-400", rgb: "217,70,239" }),
  group: buildPreset({ light: "text-amber-500", dark: "text-amber-500", rgb: "245,158,11" }),
  filter: buildPreset({ light: "text-blue-500", dark: "text-cyan-400", rgb: "34,211,238" }),
  visibility: buildPreset({ light: "text-green-500", dark: "text-green-500", rgb: "34,197,94" }),
};

const _TW = [
  "group-hover/toolbar:text-fuchsia-500",
  "dark:group-hover/toolbar:text-fuchsia-400",
  "group-hover/toolbar:text-amber-500",
  "group-hover/toolbar:text-blue-500",
  "dark:group-hover/toolbar:text-cyan-400",
  "group-hover/toolbar:text-green-500",
  "group-hover/toolbar:[filter:drop-shadow(0_0_8px_rgba(217,70,239,0.7))]",
  "group-hover/toolbar:[filter:drop-shadow(0_0_8px_rgba(245,158,11,0.7))]",
  "group-hover/toolbar:[filter:drop-shadow(0_0_8px_rgba(34,211,238,0.7))]",
  "group-hover/toolbar:[filter:drop-shadow(0_0_8px_rgba(34,197,94,0.7))]",
  "[filter:drop-shadow(0_0_6px_rgba(217,70,239,0.9))_drop-shadow(0_0_20px_rgba(217,70,239,0.5))]",
  "[filter:drop-shadow(0_0_6px_rgba(245,158,11,0.9))_drop-shadow(0_0_20px_rgba(245,158,11,0.5))]",
  "[filter:drop-shadow(0_0_6px_rgba(34,211,238,0.9))_drop-shadow(0_0_20px_rgba(34,211,238,0.5))]",
  "[filter:drop-shadow(0_0_6px_rgba(34,197,94,0.9))_drop-shadow(0_0_20px_rgba(34,197,94,0.5))]",
];

export function toolbarGlow(active: boolean, preset: GlowPreset) {
  return {
    iconClass: active ? preset.activeIconClass : preset.inactiveIconClass,
    buttonClass: active ? preset.activeButtonClass : "",
  };
}
