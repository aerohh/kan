import { BlockNoteSchema } from "@blocknote/core";
import { SuggestionMenuController } from "@blocknote/react";
import { forwardRef, useCallback, useMemo, useImperativeHandle, useRef, useEffect } from "react";

import BlockNote from "~/components/BlockNote";
import {
  getMentionItems,
  mentionInlineContentSpecs,
  type MentionMember,
  type MentionDoc,
  type MentionSuggestionItem,
} from "~/components/MentionSpec";
import { useBlockNoteEditor } from "~/hooks/useBlockNoteEditor";

export interface DocEditorForCardHandle {
  focus: () => void;
  getDocument: () => Record<string, unknown>[];
}

function hasInlineMentions(blocks: Record<string, unknown>[]): boolean {
  const walkInline = (content: unknown): boolean => {
    if (!Array.isArray(content)) return false;
    for (const inline of content) {
      if (!inline || typeof inline !== "object") continue;
      const inlineRecord = inline as Record<string, unknown>;
      if (
        inlineRecord.type === "mention" ||
        inlineRecord.type === "docMention"
      ) {
        return true;
      }
      if (walkInline(inlineRecord.content)) {
        return true;
      }
    }
    return false;
  };

  const walkBlocks = (blockList: Record<string, unknown>[]): boolean => {
    for (const block of blockList) {
      if (walkInline(block.content)) return true;
      if (
        Array.isArray(block.children) &&
        walkBlocks(block.children as Record<string, unknown>[])
      ) {
        return true;
      }
    }
    return false;
  };

  return walkBlocks(blocks);
}

const DocEditorForCard = forwardRef<
  DocEditorForCardHandle,
  {
    initialContent: string | Record<string, unknown>[] | null;
    onChange?: (value: string | Record<string, unknown>[]) => void;
    onUnmountSnapshot?: (value: Record<string, unknown>[]) => void;
    readOnly?: boolean;
    workspaceMembers?: MentionMember[];
    workspaceDocs?: MentionDoc[];
    onDocMentionInsert?: (docPublicId: string) => void;
  }
>(function DocEditorForCard({ initialContent, onChange, onUnmountSnapshot, readOnly = false, workspaceMembers, workspaceDocs, onDocMentionInsert }, ref) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onUnmountSnapshotRef = useRef(onUnmountSnapshot);
  onUnmountSnapshotRef.current = onUnmountSnapshot;
  const onDocMentionInsertRef = useRef(onDocMentionInsert);
  onDocMentionInsertRef.current = onDocMentionInsert;

  const hasMentions = (workspaceMembers && workspaceMembers.length > 0) || (workspaceDocs && workspaceDocs.length > 0);

  const schema = useMemo(() => {
    if (!hasMentions) return undefined;
    return BlockNoteSchema.create({
      inlineContentSpecs: mentionInlineContentSpecs,
    });
  }, [hasMentions]);

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
    const blocks = editor.document as Record<string, unknown>[];
    const trimmed = getFullText().trim();
    if (trimmed || hasInlineMentions(blocks)) {
      onChangeRef.current?.(blocks);
    } else {
      onChangeRef.current?.([]);
    }
  }, [editor, readOnly, getFullText]);

  const getMentionItemsForEditor = useCallback(
    async (query: string): Promise<MentionSuggestionItem[]> => {
      return getMentionItems(workspaceMembers ?? [], workspaceDocs ?? [], query);
    },
    [workspaceMembers, workspaceDocs],
  );

  const handleMentionItemClick = useCallback(
    (item: MentionSuggestionItem) => {
      if (!editor) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor as any).insertInlineContent([
        {
          type: item.kind === "doc" ? "docMention" : "mention",
          props: { id: item.id, label: item.label },
        },
        " ",
      ]);
      if (item.kind === "doc") {
        onDocMentionInsertRef.current?.(item.id);
      }
    },
    [editor],
  );

  return (
    <div
      ref={editorWrapperRef}
      className="doc-editor min-h-[200px] transition-colors duration-200 [&_.bn-editor]:!min-h-0"
    >
      <BlockNote
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        editor={editor as any}
        resolvedTheme={resolvedTheme}
        onChange={handleChange}
        editable={!readOnly}
      >
        {hasMentions && (
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
