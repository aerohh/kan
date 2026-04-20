export function toolbarGlow(active: boolean, color: string, rgb: string) {
  return {
    iconClass: active ? color : "",
    buttonClass: active
      ? `${color} [filter:drop-shadow(0_0_6px_rgba(${rgb},0.9))_drop-shadow(0_0_20px_rgba(${rgb},0.5))]`
      : "",
  };
}
