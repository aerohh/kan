import { defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec, type DefaultReactSuggestionItem } from "@blocknote/react";

export interface MentionMember {
  id: string;
  label: string;
  image: string | null;
}

export type MentionSuggestionItem = DefaultReactSuggestionItem & {
  id: string;
  label: string;
  image: string | null;
};

const mentionSpec = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: {
      id: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span
        data-mention-id={props.inlineContent.props.id}
        data-mention-label={props.inlineContent.props.label}
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 align-baseline text-sm font-medium text-blue-600 dark:text-blue-400"
        style={{ backgroundColor: "rgba(59,130,246,0.1)" }}
        ref={props.contentRef}
      >
        @{props.inlineContent.props.label}
      </span>
    ),
    toExternalHTML: (props) => (
      <span
        data-type="mention"
        data-id={props.inlineContent.props.id}
        data-label={props.inlineContent.props.label}
      >
        @{props.inlineContent.props.label}
      </span>
    ),
    parse: (el) => {
      if (el.getAttribute("data-type") === "mention") {
        return {
          id: el.getAttribute("data-id") ?? "",
          label: el.getAttribute("data-label") ?? "",
        };
      }
      if (el.tagName === "SPAN" && el.getAttribute("data-mention-id")) {
        return {
          id: el.getAttribute("data-mention-id") ?? "",
          label: el.getAttribute("data-mention-label") ?? "",
        };
      }
      return undefined;
    },
  },
);

export const mentionInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  mention: mentionSpec,
};

export function getMentionItems(
  members: MentionMember[],
  query: string,
): MentionSuggestionItem[] {
  const q = query.toLowerCase().trim();
  const mapped = members
    .filter((m) => m.label.length > 0)
    .map((m) => ({
      id: m.id,
      label: m.label,
      image: m.image,
      title: `@${m.label}`,
      onItemClick: () => {},
    }));

  if (!q) return mapped;
  return mapped.filter((m) => m.label.toLowerCase().includes(q));
}
