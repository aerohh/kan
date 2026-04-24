import { t } from "@lingui/core/macro";
import { useRouter } from "next/router";
import { HiDocumentPlus, HiDocumentText } from "react-icons/hi2";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function DocsView() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { data: docs } = api.doc.list.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId },
  );

  return (
    <>
      <PageHead title={t`Docs | ${workspace.name ?? t`Workspace`}`} />
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-light-300 bg-light-50 px-6 py-4 dark:border-dark-300 dark:bg-dark-50">
          <h1 className="text-lg font-semibold text-light-1000 dark:text-dark-1000">
            {t`Docs`}
          </h1>
          <Button
            type="button"
            variant="primary"
            iconLeft={<HiDocumentPlus className="h-4 w-4" />}
            onClick={() => router.push("/docs/new")}
          >
            {t`New Doc`}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!docs || docs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-light-200 dark:bg-dark-200">
                <HiDocumentPlus className="h-8 w-8 text-light-900 dark:text-dark-900" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-dark-1000">
                  {t`No documents yet`}
                </h2>
                <p className="text-sm text-light-900 dark:text-dark-900">
                  {t`Create your first document to get started.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc) => (
                <button
                  key={doc.publicId}
                  onClick={() => router.push(`/docs/${doc.publicId}`)}
                  className="flex items-start gap-3 rounded-lg border border-light-300 bg-light-50 p-4 text-left transition-colors hover:border-light-400 hover:bg-light-100 dark:border-dark-300 dark:bg-dark-50 dark:hover:border-dark-400 dark:hover:bg-dark-100"
                >
                  <HiDocumentText className="mt-0.5 h-5 w-5 flex-shrink-0 text-light-800 dark:text-dark-800" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-light-1000 dark:text-dark-1000">
                      {doc.title || "Untitled"}
                    </div>
                    <div className="mt-1 text-xs text-light-800 dark:text-dark-800">
                      {doc.updatedAt
                        ? new Date(doc.updatedAt).toLocaleDateString()
                        : new Date(doc.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
