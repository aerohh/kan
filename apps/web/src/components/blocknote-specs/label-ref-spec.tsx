import { defaultInlineContentSpecs } from "@blocknote/core";
import { createReactInlineContentSpec } from "@blocknote/react";

const FALLBACK_COLOUR = "#6366f1";

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
      const colour = props.inlineContent.props.colourCode || FALLBACK_COLOUR;
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

export const labelRefInlineContentSpecs = {
  ...defaultInlineContentSpecs,
  labelRef: labelRefSpec,
};
