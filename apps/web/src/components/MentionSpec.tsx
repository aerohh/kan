import { defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { HiDocumentText } from "react-icons/hi2";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = () => {};

export interface MentionMember {
  id: string;
  label: string;
  image: string | null;
}

export interface MentionDoc {
  id: string;
  label: string;
}

export interface LabelRefItem {
  publicId: string;
  name: string;
  colourCode: string | null;
}

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

const labelRefSpec = createReactInlineContentSpec(
  {
    type: "labelRef",
    propSchema: {
      id: { default: "" },
      name: { default: "" },
      colourCode: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const colour = props.inlineContent.props.colourCode || "#3730a3";
      return (
        <span
          data-label-ref-id={props.inlineContent.props.id}
          data-label-ref-name={props.inlineContent.props.name}
          data-label-ref-colour={props.inlineContent.props.colourCode}
          className="inline-flex w-fit items-center justify-center rounded-full border-2 px-3 pb-2.5 pt-2 text-[10px] font-medium leading-none"
          style={{
            backgroundColor: `${colour}25`,
            borderColor: `${colour}30`,
            color: colour,
          }}
          ref={props.contentRef}
        >
          <span>#{props.inlineContent.props.name}</span>
        </span>
      );
    },
    toExternalHTML: (props) => (
      <span
        data-type="labelRef"
        data-id={props.inlineContent.props.id}
        data-name={props.inlineContent.props.name}
        data-colour={props.inlineContent.props.colourCode}
      >
        #{props.inlineContent.props.name}
      </span>
    ),
    parse: (el) => {
      if (el.getAttribute("data-type") === "labelRef") {
        return {
          id: el.getAttribute("data-id") ?? "",
          name: el.getAttribute("data-name") ?? "",
          colourCode: el.getAttribute("data-colour") ?? "",
        };
      }
      if (el.tagName === "SPAN" && el.getAttribute("data-label-ref-id")) {
        return {
          id: el.getAttribute("data-label-ref-id") ?? "",
          name: el.getAttribute("data-label-ref-name") ?? "",
          colourCode: el.getAttribute("data-label-ref-colour") ?? "",
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

export const labelRefInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  labelRef: labelRefSpec,
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

export function extractLabelRefIds(
  blocks: Record<string, unknown>[],
): string[] {
  const ids: string[] = [];

  function walkInlineContent(content: unknown) {
    if (!Array.isArray(content)) return;
    for (const inline of content) {
      if (!inline || typeof inline !== "object") continue;
      const i = inline as Record<string, unknown>;
      if (i.type === "labelRef" && i.props && typeof i.props === "object") {
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
