import { useCreateBlockNote } from "@blocknote/react";
import type { CustomBlockNoteSchema } from "@blocknote/core";
import { useTheme } from "next-themes";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

export function extractTextFromBlock(block: {
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
          text += extractTextFromBlock(item) + " ";
        }
      }
    }
  }
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      text += extractTextFromBlock(child) + " ";
    }
  }
  return text;
}

interface UseBlockNoteEditorOptions {
  placeholders: {
    default: string;
    heading: string;
    numberedListItem: string;
    bulletListItem: string;
    checkListItem: string;
  };
  wrapperRef: RefObject<HTMLDivElement | null>;
  initialContent?: string | null;
  schema?: CustomBlockNoteSchema<any, any, any>;
}

export function useBlockNoteEditor({
  placeholders,
  wrapperRef,
  initialContent,
  schema,
}: UseBlockNoteEditorOptions) {
  const { resolvedTheme } = useTheme();
  const initialContentRef = useRef(initialContent);
  initialContentRef.current = initialContent;
  const isContentLoaded = useRef(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = useCreateBlockNote(schema ? { schema } as any : { placeholders });

  useEffect(() => {
    if (!wrapperRef.current) return;
    const wrapper = wrapperRef.current;
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
  }, [resolvedTheme, wrapperRef]);

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

  const getFullText = useCallback(() => {
    if (!editor) return "";
    let fullText = "";
    for (const block of editor.document) {
      fullText += extractTextFromBlock(block as Record<string, unknown>) + " ";
    }
    return fullText;
  }, [editor]);

  const focus = useCallback(() => {
    editor?.focus();
  }, [editor]);

  return { editor, resolvedTheme, getFullText, focus };
}
