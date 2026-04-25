import { t } from "@lingui/core/macro";
import { HiXMark } from "react-icons/hi2";
import { useRef } from "react";

import BlockNote from "~/components/BlockNote";
import { useBlockNoteEditor } from "~/hooks/useBlockNoteEditor";
import { api } from "~/utils/api";

const noop = () => {};

function DocViewerEditor({ content }: { content: Record<string, unknown>[] | null }) {
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const { editor, resolvedTheme } = useBlockNoteEditor({
    placeholders: {
      default: "",
      heading: "Heading",
      numberedListItem: "List",
      bulletListItem: "List",
      checkListItem: "Todo",
    },
    wrapperRef: editorWrapperRef,
    initialContent: content,
  });

  return (
    <div ref={editorWrapperRef} className="doc-editor min-h-[200px] [&_.bn-editor]:!min-h-0">
      <BlockNote
        editor={editor}
        resolvedTheme={resolvedTheme}
        onChange={noop}
        editable={false}
      />
    </div>
  );
}

interface DocViewerPanelProps {
  docPublicId: string | null;
  onClose: () => void;
}

export default function DocViewerPanel({ docPublicId, onClose }: DocViewerPanelProps) {
  const { data: doc, isLoading } = api.doc.byId.useQuery(
    { docPublicId: docPublicId ?? "" },
    { enabled: !!docPublicId },
  );

  if (!docPublicId) return null;

  return (
    <div className="flex h-full w-[360px] flex-col border-l border-light-300 bg-light-50 dark:border-dark-300 dark:bg-dark-50">
      <div className="flex items-center justify-between border-b border-light-300 px-4 py-3 dark:border-dark-300">
        <h2 className="truncate text-sm font-semibold text-light-900 dark:text-dark-900">
          {isLoading ? t`Loading...` : (doc?.title || t`Untitled`)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
          aria-label={t`Close`}
        >
          <HiXMark className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading || !doc ? (
          <div className="flex items-center justify-center py-8 text-sm text-light-800 dark:text-dark-800">
            {t`Loading...`}
          </div>
        ) : (
          <DocViewerEditor key={docPublicId} content={doc?.content as Record<string, unknown>[] | null ?? null} />
        )}
      </div>
    </div>
  );
}
