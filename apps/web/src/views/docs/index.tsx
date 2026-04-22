import { t } from "@lingui/core/macro";
import { useRouter } from "next/router";
import { HiDocumentPlus } from "react-icons/hi2";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import { useWorkspace } from "~/providers/workspace";

export default function DocsView() {
  const router = useRouter();
  const { workspace } = useWorkspace();

  return (
    <>
      <PageHead title={t`Docs | ${workspace.name ?? t`Workspace`}`} />
      <div className="flex h-full flex-col items-center justify-center px-8">
        <div className="flex flex-col items-center gap-6">
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
          <Button
            type="button"
            variant="primary"
            iconLeft={<HiDocumentPlus className="h-4 w-4" />}
            onClick={() => router.push("/docs/new")}
          >
            {t`New Doc`}
          </Button>
        </div>
      </div>
    </>
  );
}
