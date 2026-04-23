import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";

import "@blocknote/mantine/style.css";

function extractTextFromBlock(block: {
  content?: Record<string, unknown>[];
  children?: Record<string, unknown>[];
}): string {
  let text = "";
  if (block.content && Array.isArray(block.content)) {
    for (const item of block.content) {
      if (typeof item === "object" && item !== null) {
        if ("text" in item && typeof item.text === "string") {
          text += item.text + " ";
        }
        if ("content" in item && Array.isArray(item.content)) {
          text += extractTextFromBlock(item as Record<string, unknown>) + " ";
        }
      }
    }
  }
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      text += extractTextFromBlock(child as Record<string, unknown>) + " ";
    }
  }
  return text;
}

export default function DocEditorForCard({
  initialContent,
  onChange,
  readOnly = false,
}: {
  initialContent: string | null;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;
  const isContentLoaded = useRef(false);

  const editor = useCreateBlockNote({
    placeholders: {
      default: "Add description...",
      heading: "Heading",
      numberedListItem: "List",
      bulletListItem: "List",
      checkListItem: "Todo",
    },
  });

  useEffect(() => {
    if (!editorWrapperRef.current) return;
    const wrapper = editorWrapperRef.current;
    const bnRoot = wrapper.querySelector(".bn-root");
    if (bnRoot) {
      bnRoot.setAttribute(
        "data-color-scheme",
        resolvedTheme === "dark" ? "dark" : "light",
      );
    }
    const bnMantine = wrapper.querySelector(".bn-mantine");
    if (bnMantine) {
      bnMantine.setAttribute(
        "data-mantine-color-scheme",
        resolvedTheme === "dark" ? "dark" : "light",
      );
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!editor || isContentLoaded.current) return;
    const content = initialContentRef.current;
    if (!content) {
      isContentLoaded.current = true;
      return;
    }
    try {
      const blocks = editor.tryParseHTMLToBlocks(content);
      if (blocks && blocks.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor as any).removeBlocks(editor.document);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (editor as any).insertBlocks(blocks);
      }
    } catch {
      try {
        const blocks = editor.tryParseMarkdownToBlocks(content);
        if (blocks && blocks.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor as any).removeBlocks(editor.document);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (editor as any).insertBlocks(blocks);
        }
      } catch {
        // If both fail, leave as-is
      }
    }
    isContentLoaded.current = true;
  }, [editor]);

  const handleChange = useCallback(() => {
    if (!editor || readOnly) return;
    let fullText = "";
    for (const block of editor.document) {
      fullText += extractTextFromBlock(block as Record<string, unknown>) + " ";
    }
    const trimmed = fullText.trim();
    if (trimmed) {
      const html = editor.blocksToHTMLLossy();
      onChangeRef.current?.(html);
    } else {
      onChangeRef.current?.("");
    }
  }, [editor, readOnly]);

  return (
    <div
      ref={editorWrapperRef}
      className="doc-editor min-h-[200px] transition-colors duration-200 light:bg=[hsl(0deg 0% 98.8%)] dark:bg-[#161616]"
    >
      <div className="[&_.bn-container]:!max-w-none [&_.bn-editor]:!px-0 [&_.bn-editor]:!py-0 [&_.bn-editor]:!min-h-0">
        <BlockNoteView
          editor={editor}
          // theme={resolvedTheme === "dark" ? "dark" : "light"}
          theme={resolvedTheme === "dark" ? {colors: {editor: {background: '#161616'}}} : {colors: {editor: {background: 'hsl(0deg 0% 98.8%)'}}}}
          onChange={handleChange}
          editable={!readOnly}
        />
      </div>
    </div>
  );
}
