import { defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";
import { HiDocumentText } from "react-icons/hi2";

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
