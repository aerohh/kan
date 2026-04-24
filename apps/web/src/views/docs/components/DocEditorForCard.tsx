import { BlockNoteSchema } from "@blocknote/core";
import { SuggestionMenuController } from "@blocknote/react";
import { forwardRef, useCallback, useMemo, useImperativeHandle, useRef, useEffect } from "react";

import BlockNote from "~/components/BlockNote";
import {
  getMentionItems,
  mentionInlineContentSpecs,
  type MentionMember,
  type MentionSuggestionItem,
} from "~/components/MentionSpec";
import { useBlockNoteEditor } from "~/hooks/useBlockNoteEditor";

export interface DocEditorForCardHandle {
  focus: () => void;
  getDocument: () => Record<string, unknown>[];
}

const DocEditorForCard = forwardRef<
  DocEditorForCardHandle,
  {
    initialContent: string | Record<string, unknown>[] | null;
    onChange?: (value: string | Record<string, unknown>[]) => void;
    onUnmountSnapshot?: (value: Record<string, unknown>[]) => void;
    readOnly?: boolean;
    workspaceMembers?: MentionMember[];
  }
>(function DocEditorForCard({ initialContent, onChange, onUnmountSnapshot, readOnly = false, workspaceMembers }, ref) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onUnmountSnapshotRef = useRef(onUnmountSnapshot);
  onUnmountSnapshotRef.current = onUnmountSnapshot;

  const schema = useMemo(() => {
    if (!workspaceMembers || workspaceMembers.length === 0) return undefined;
    return BlockNoteSchema.create({
      inlineContentSpecs: mentionInlineContentSpecs,
    });
  }, [workspaceMembers]);

  const { editor, resolvedTheme, getFullText, focus } = useBlockNoteEditor({
    placeholders: {
      default: "Add description...",
      heading: "Heading",
      numberedListItem: "List",
      bulletListItem: "List",
      checkListItem: "Todo",
    },
    wrapperRef: editorWrapperRef,
    initialContent,
    schema,
  });

  const getDocument = useCallback(() => {
    if (!editor) return [];
    return JSON.parse(JSON.stringify(editor.document)) as Record<string, unknown>[];
  }, [editor]);

  const getDocumentRef = useRef(getDocument);
  getDocumentRef.current = getDocument;

  useImperativeHandle(ref, () => ({ focus, getDocument }), [focus, getDocument]);

  useEffect(() => {
    return () => {
      onUnmountSnapshotRef.current?.(getDocumentRef.current());
    };
  }, []);

  const handleChange = useCallback(() => {
    if (!editor || readOnly) return;
    const trimmed = getFullText().trim();
    if (trimmed) {
      const blocks = editor.document;
      onChangeRef.current?.(blocks);
    } else {
      onChangeRef.current?.([]);
    }
  }, [editor, readOnly, getFullText]);

  const getMentionItemsForEditor = useCallback(
    async (query: string): Promise<MentionSuggestionItem[]> => {
      if (!workspaceMembers) return [];
      return getMentionItems(workspaceMembers, query);
    },
    [workspaceMembers],
  );

  const handleMentionItemClick = useCallback(
    (item: MentionSuggestionItem) => {
      if (!editor) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).insertInlineContent([
        {
          type: "mention",
          props: { id: item.id, label: item.label },
        },
        " ",
      ]);
    },
    [editor],
  );

  return (
    <div
      ref={editorWrapperRef}
      className="doc-editor min-h-[200px] transition-colors duration-200 [&_.bn-editor]:!min-h-0"
    >
      <BlockNote
        editor={editor}
        resolvedTheme={resolvedTheme}
        onChange={handleChange}
        editable={!readOnly}
      >
        {workspaceMembers && workspaceMembers.length > 0 && (
          <SuggestionMenuController
            triggerCharacter="@"
            getItems={getMentionItemsForEditor}
            onItemClick={handleMentionItemClick}
          />
        )}
      </BlockNote>
    </div>
  );
});

export default DocEditorForCard;
