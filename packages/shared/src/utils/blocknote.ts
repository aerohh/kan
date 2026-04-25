export function extractInlineContentIds(
  blocks: unknown[],
  types: string[],
  options?: { dedupe?: boolean; minIdLength?: number },
): string[] {
  const { dedupe = true, minIdLength = 0 } = options ?? {};
  const ids: string[] = [];
  const typeSet = new Set(types);

  function walkInlineContent(content: unknown) {
    if (!Array.isArray(content)) return;
    for (const inline of content) {
      if (!inline || typeof inline !== "object") continue;
      const record = inline as Record<string, unknown>;
      if (
        typeSet.has(record.type as string) &&
        typeof record.props === "object" &&
        record.props !== null
      ) {
        const props = record.props as Record<string, unknown>;
        if (typeof props.id === "string" && props.id.length >= minIdLength) {
          ids.push(props.id);
        }
      }
      if (Array.isArray(record.content)) {
        walkInlineContent(record.content);
      }
    }
  }

  function walkBlocks(blockList: unknown[]) {
    for (const block of blockList) {
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      walkInlineContent(b.content);
      if (Array.isArray(b.children)) walkBlocks(b.children);
    }
  }

  walkBlocks(blocks);
  return dedupe ? Array.from(new Set(ids)) : ids;
}

export function hasInlineContentOfType(
  blocks: unknown[],
  types: string[],
): boolean {
  const typeSet = new Set(types);

  function walkInlineContent(content: unknown): boolean {
    if (!Array.isArray(content)) return false;
    for (const inline of content) {
      if (!inline || typeof inline !== "object") continue;
      const record = inline as Record<string, unknown>;
      if (typeSet.has(record.type as string)) return true;
      if (Array.isArray(record.content) && walkInlineContent(record.content))
        return true;
    }
    return false;
  }

  function walkBlocks(blockList: unknown[]): boolean {
    for (const block of blockList) {
      if (!block || typeof block !== "object") continue;
      const b = block as Record<string, unknown>;
      if (walkInlineContent(b.content)) return true;
      if (Array.isArray(b.children) && walkBlocks(b.children)) return true;
    }
    return false;
  }

  return walkBlocks(blocks);
}
