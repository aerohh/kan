import dynamic from "next/dynamic";

import { api } from "~/utils/api";

const DocEditorInner = dynamic(() => import("./DocEditorInner"), {
  ssr: false,
});

interface DocEditorProps {
  docPublicId?: string;
  workspacePublicId: string;
}

export default function DocEditor({ docPublicId, workspacePublicId }: DocEditorProps) {
  const { data: existingDoc, isLoading, isFetching } = api.doc.byId.useQuery(
    { docPublicId: docPublicId ?? "" },
    {
      enabled: !!docPublicId,
      refetchOnMount: "always",
    },
  );

  if (docPublicId && (isLoading || isFetching || !existingDoc)) {
    return (
      <div className="flex h-full items-center justify-center text-light-800 dark:text-dark-800">
        Loading...
      </div>
    );
  }

  const editorKey = docPublicId ?? "new-doc";

  return (
    <DocEditorInner
      key={editorKey}
      docPublicId={docPublicId}
      workspacePublicId={workspacePublicId}
      initialDoc={existingDoc ?? null}
    />
  );
}
