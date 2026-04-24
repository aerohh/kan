function extractMentionIdsFromBlocks(blocks: unknown[]): string[] {
  const ids: string[] = [];

  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    const obj = value as Record<string, unknown>;

    if (obj.type === "mention" && typeof obj.props === "object" && obj.props !== null) {
      const props = obj.props as Record<string, unknown>;
      if (typeof props.id === "string" && props.id.length >= 12) {
        ids.push(props.id);
      }
    }

    if (Array.isArray(obj.content)) {
      for (const item of obj.content) walk(item);
    }
    if (Array.isArray(obj.children)) {
      for (const child of obj.children) walk(child);
    }
  }

  walk(blocks);
  return Array.from(new Set(ids));
}

export function parseMentionsFromHTML(htmlContent: string): string[] {
  if (!htmlContent) return [];

  const mentionRegex = /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/gi;
  const matches = Array.from(htmlContent.matchAll(mentionRegex));

  const mentionIds = matches
    .map((match) => match[1])
    .filter((id): id is string => !!id && id.length >= 12);

  return Array.from(new Set(mentionIds));
}

export function parseMentionsFromContent(content: string | unknown[] | null | undefined): string[] {
  if (!content) return [];
  if (typeof content === "string") return parseMentionsFromHTML(content);
  if (Array.isArray(content)) return extractMentionIdsFromBlocks(content);
  return [];
}

