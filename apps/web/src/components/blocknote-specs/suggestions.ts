import type { DefaultReactSuggestionItem } from "@blocknote/react";

import type { LabelRefItem, MentionDoc, MentionMember } from "./types";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export type MentionSuggestionItem = DefaultReactSuggestionItem & {
  id: string;
  label: string;
  image: string | null;
  kind: "member" | "doc";
};

export type LabelRefSuggestionItem = DefaultReactSuggestionItem & {
  publicId: string;
  name: string;
  colourCode: string | null;
};

export function getMentionItems(
  members: MentionMember[],
  docs: MentionDoc[],
  query: string,
): MentionSuggestionItem[] {
  const q = query.toLowerCase().trim();

  const memberItems: MentionSuggestionItem[] = members
    .filter((m) => m.label.length > 0)
    .map((m) => ({
      id: m.id,
      label: m.label,
      image: m.image,
      kind: "member" as const,
      title: `@${m.label}`,
      onItemClick: noop,
    }));

  const docItems: MentionSuggestionItem[] = docs
    .filter((d) => d.label.length > 0)
    .map((d) => ({
      id: d.id,
      label: d.label,
      image: null,
      kind: "doc" as const,
      title: d.label,
      onItemClick: noop,
    }));

  const all = [...memberItems, ...docItems];

  if (!q) return all;
  return all.filter((item) => item.label.toLowerCase().includes(q));
}

export function getLabelRefItems(
  labels: LabelRefItem[],
  query: string,
): LabelRefSuggestionItem[] {
  const q = query.toLowerCase().trim();

  const items: LabelRefSuggestionItem[] = labels
    .filter((l) => l.name.length > 0)
    .map((l) => ({
      publicId: l.publicId,
      name: l.name,
      colourCode: l.colourCode,
      title: l.name,
      onItemClick: noop,
    }));

  if (!q) return items;
  return items.filter((item) => item.name.toLowerCase().includes(q));
}
