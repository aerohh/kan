import { extractInlineContentIds } from "./blocknote";

export function parseMentionsFromHTML(htmlContent: string): string[] {
  if (!htmlContent) return [];

  const mentionRegex =
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>/gi;
  const matches = Array.from(htmlContent.matchAll(mentionRegex));

  const mentionIds = matches
    .map((match) => match[1])
    .filter((id): id is string => !!id && id.length >= 12);

  return Array.from(new Set(mentionIds));
}

export function parseMentionsFromContent(
  content: string | unknown[] | null | undefined,
): string[] {
  if (!content) return [];
  if (typeof content === "string") return parseMentionsFromHTML(content);
  if (Array.isArray(content))
    return extractInlineContentIds(content, ["mention"], {
      minIdLength: 12,
    });
  return [];
}
