import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

import BlockNote from "~/components/BlockNote";
import { useBlockNoteEditor } from "~/hooks/useBlockNoteEditor";
import { api } from "~/utils/api";

interface DocEditorInnerProps {
  docPublicId?: string;
  workspacePublicId: string;
  initialDoc: {
    publicId: string;
    title: string;
    content: unknown[];
  } | null;
}

export default function DocEditorInner({
  docPublicId,
  workspacePublicId,
  initialDoc,
}: DocEditorInnerProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialDoc?.title ?? "");
  const [wordCount, setWordCount] = useState(0);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSavePayloadRef = useRef<{
    targetDocId: string;
    title: string;
    content: unknown[];
  } | null>(null);
  const latestSnapshotRef = useRef<{
    title: string;
    content: unknown[];
  }>({
    title: initialDoc?.title ?? "",
    content: Array.isArray(initialDoc?.content) ? initialDoc.content : [],
  });
  const hasUnsavedChangesRef = useRef(false);
  const docIdRef = useRef(docPublicId ?? null);
  const creatingDocPromiseRef = useRef<Promise<string> | null>(null);
  const flushPendingSaveRef = useRef<() => Promise<void>>(async () => {});

  const createDoc = api.doc.create.useMutation();
  const updateDoc = api.doc.update.useMutation();

  const { editor, resolvedTheme, getFullText, isReady } = useBlockNoteEditor({
    placeholders: {
      default: "Type '/' for commands, or start writing...",
      heading: "Heading",
      numberedListItem: "List",
      bulletListItem: "List",
      checkListItem: "Todo",
    },
    wrapperRef: editorWrapperRef,
    initialContent: initialDoc?.content as Record<string, unknown>[] | null ?? null,
  });

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, []);

  const saveDoc = useCallback((targetDocId: string, newTitle: string, newContent: unknown[]) => {
    hasUnsavedChangesRef.current = false;
    updateDoc.mutate({
      docPublicId: targetDocId,
      title: newTitle,
      content: newContent,
    });
  }, [updateDoc]);

  const debouncedSave = useCallback(
    (targetDocId: string, newTitle: string, newContent: unknown[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      pendingSavePayloadRef.current = {
        targetDocId,
        title: newTitle,
        content: newContent,
      };
      saveTimeoutRef.current = setTimeout(() => {
        pendingSavePayloadRef.current = null;
        saveDoc(targetDocId, newTitle, newContent);
      }, 1500);
    },
    [saveDoc],
  );

  const ensureDocExists = useCallback(async () => {
    const existingDocId = docIdRef.current;
    if (existingDocId) return existingDocId;

    const pendingCreation = creatingDocPromiseRef.current;
    if (pendingCreation) return pendingCreation;

    const createPromise = createDoc
      .mutateAsync({
        workspacePublicId,
        title: "",
        content: [],
      })
      .then((result) => {
        docIdRef.current = result.publicId;
        if (router.isReady && !docPublicId) {
          router.replace(`/docs/${result.publicId}`, undefined, { shallow: true });
        }
        return result.publicId;
      })
      .finally(() => {
        creatingDocPromiseRef.current = null;
      });

    creatingDocPromiseRef.current = createPromise;
    return createPromise;
  }, [createDoc, workspacePublicId, router, docPublicId]);

  const flushPendingSave = useCallback(async () => {
    const pendingSave = pendingSavePayloadRef.current;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    pendingSavePayloadRef.current = null;

    if (pendingSave) {
      saveDoc(pendingSave.targetDocId, pendingSave.title, pendingSave.content);
      return;
    }

    if (!hasUnsavedChangesRef.current) {
      return;
    }

    const targetDocId = docIdRef.current ?? await ensureDocExists();
    const latestSnapshot = latestSnapshotRef.current;
    saveDoc(targetDocId, latestSnapshot.title, latestSnapshot.content);
  }, [ensureDocExists, saveDoc]);

  useEffect(() => {
    flushPendingSaveRef.current = flushPendingSave;
  }, [flushPendingSave]);

  useEffect(() => {
    return () => {
      if (pendingSavePayloadRef.current || docIdRef.current) {
        void flushPendingSaveRef.current();
      }
    };
  }, []);

  const handleTitleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      const target = e.target;
      target.style.height = "auto";
      target.style.height = `${target.scrollHeight}px`;
      latestSnapshotRef.current = {
        title: newTitle,
        content: editor.document,
      };
      hasUnsavedChangesRef.current = true;

      const existingDocId = docIdRef.current;
      if (existingDocId && isReady) {
        debouncedSave(existingDocId, newTitle, editor.document);
      } else if (!existingDocId && isReady) {
        void ensureDocExists().then((id) => {
          debouncedSave(id, newTitle, editor.document);
        });
      }
    },
    [editor, isReady, debouncedSave, ensureDocExists],
  );

  const handleTitleBlur = useCallback(async () => {
    if (!hasUnsavedChangesRef.current) return;
    const targetDocId = docIdRef.current ?? await ensureDocExists();
    saveDoc(targetDocId, title, editor.document);
  }, [editor, title, ensureDocExists, saveDoc]);

  const handleEditorChange = useCallback(async () => {
    if (!isReady) return;
    let fullText = getFullText();
    if (title) {
      fullText = title + " " + fullText;
    }
    const words = fullText
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    setWordCount(words.length);
    latestSnapshotRef.current = {
      title,
      content: editor.document,
    };
    hasUnsavedChangesRef.current = true;

    const targetDocId = docIdRef.current ?? await ensureDocExists();
    debouncedSave(targetDocId, title, editor.document);
  }, [editor, isReady, title, getFullText, ensureDocExists, debouncedSave]);

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
      editor.focus();
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
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          rows={1}
          className="doc-title-input mb-4 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[2.75rem] font-bold leading-[1.2] tracking-tight text-light-1000 placeholder:text-light-800 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-800"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor.focus();
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
