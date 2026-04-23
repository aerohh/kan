import { useCallback, useEffect, useRef, useState } from "react";

import BlockNote from "~/components/BlockNote";
import { useBlockNoteEditor } from "~/hooks/useBlockNoteEditor";

export default function DocEditorInner() {
  const [title, setTitle] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  const { editor, resolvedTheme, getFullText } = useBlockNoteEditor({
    placeholders: {
      default: "Type '/' for commands, or start writing...",
      heading: "Heading",
      numberedListItem: "List",
      bulletListItem: "List",
      checkListItem: "Todo",
    },
    wrapperRef: editorWrapperRef,
  });

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, []);

  const handleTitleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTitle(e.target.value);
      const target = e.target;
      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
    },
    [],
  );

  const handleEditorChange = useCallback(() => {
    if (!editor) return;
    let fullText = getFullText();
    if (title) {
      fullText = title + " " + fullText;
    }
    const words = fullText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [editor, title, getFullText]);

  const handleWrapperClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.closest("textarea")) {
        return;
      }
      if (target.tagName === "BUTTON" || target.closest("button")) {
        return;
      }
      if (target.classList.contains("bn-editor")) {
        return;
      }
      if (target.closest(".bn-editor")) {
        return;
      }
      editor?.focus();
    },
    [editor],
  );

  return (
    <div
      ref={editorWrapperRef}
      className="doc-editor min-h-full transition-colors duration-200"
      onClick={handleWrapperClick}
    >
      <div className="mx-auto max-w-[720px] px-6 pb-32 pt-10 sm:px-8">
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleInput}
          placeholder="Untitled"
          rows={1}
          className="doc-title-input mb-4 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[2.75rem] font-bold leading-[1.2] tracking-tight text-light-1000 placeholder:text-light-800 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-800"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.focus();
            }
          }}
        />

        <BlockNote
          editor={editor}
          resolvedTheme={resolvedTheme}
          onChange={handleEditorChange}
          className="mt-10"
        />
        {wordCount > 0 && (
          <div className="mt-12 text-xs text-light-800 dark:text-dark-800">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </div>
        )}
      </div>
    </div>
  );
}
