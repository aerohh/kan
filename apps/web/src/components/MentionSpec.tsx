import { defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec, type DefaultReactSuggestionItem } from "@blocknote/react";
import { HiDocumentText } from "react-icons/hi2";

export interface MentionMember {
  id: string;
  label: string;
  image: string | null;
}

export interface MentionDoc {
  id: string;
  label: string;
}

export type MentionSuggestionItem = DefaultReactSuggestionItem & {
  id: string;
  label: string;
  image: string | null;
  kind: "member" | "doc";
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

const docMentionSpec = createReactInlineContentSpec(
  {
    type: "docMention",
    propSchema: {
      id: { default: "" },
      label: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span
        data-doc-mention-id={props.inlineContent.props.id}
        data-doc-mention-label={props.inlineContent.props.label}
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 align-baseline text-sm font-medium text-emerald-600 dark:text-emerald-400"
        style={{ backgroundColor: "rgba(16,185,129,0.1)" }}
        ref={props.contentRef}
      >
        <HiDocumentText className="h-3.5 w-3.5" />
        {props.inlineContent.props.label}
      </span>
    ),
    toExternalHTML: (props) => (
      <span
        data-type="docMention"
        data-id={props.inlineContent.props.id}
        data-label={props.inlineContent.props.label}
      >
        @{props.inlineContent.props.label}
      </span>
    ),
    parse: (el) => {
      if (el.getAttribute("data-type") === "docMention") {
        return {
          id: el.getAttribute("data-id") ?? "",
          label: el.getAttribute("data-label") ?? "",
        };
      }
      if (el.tagName === "SPAN" && el.getAttribute("data-doc-mention-id")) {
        return {
          id: el.getAttribute("data-doc-mention-id") ?? "",
          label: el.getAttribute("data-doc-mention-label") ?? "",
        };
      }
      return undefined;
    },
  },
);

export const mentionInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  mention: mentionSpec,
  docMention: docMentionSpec,
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
      onItemClick: () => {},
    }));

  const docItems: MentionSuggestionItem[] = docs
    .filter((d) => d.label.length > 0)
    .map((d) => ({
      id: d.id,
      label: d.label,
      image: null,
      kind: "doc" as const,
      title: d.label,
      onItemClick: () => {},
    }));

  const all = [...memberItems, ...docItems];

  if (!q) return all;
  return all.filter((item) => item.label.toLowerCase().includes(q));
}

export function extractDocMentionIds(
  blocks: Record<string, unknown>[],
): string[] {
  const ids: string[] = [];

  function walkInlineContent(content: unknown) {
    if (!Array.isArray(content)) return;
    for (const inline of content) {
      if (!inline || typeof inline !== "object") continue;
      const i = inline as Record<string, unknown>;
      if (i.type === "docMention" && i.props && typeof i.props === "object") {
        const p = i.props as Record<string, unknown>;
        if (typeof p.id === "string" && p.id) ids.push(p.id);
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
  return ids;
}
