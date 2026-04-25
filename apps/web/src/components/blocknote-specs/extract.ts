import {
  extractInlineContentIds,
  hasInlineContentOfType,
} from "@kan/shared/utils";

export { extractInlineContentIds, hasInlineContentOfType };

export function extractDocMentionIds(
  blocks: Record<string, unknown>[],
): string[] {
  return extractInlineContentIds(blocks, ["docMention"]);
}

export function extractLabelRefIds(
  blocks: Record<string, unknown>[],
): string[] {
  return extractInlineContentIds(blocks, ["labelRef"]);
}

export function hasInlineMentions(
  blocks: Record<string, unknown>[],
): boolean {
  return hasInlineContentOfType(blocks, ["mention", "docMention"]);
}
