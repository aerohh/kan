import { t } from "@lingui/core/macro";
import { HiDocumentText } from "react-icons/hi2";

interface AttachedDocsProps {
  docs: { publicId: string; title: string }[];
  onDocClick: (docPublicId: string) => void;
}

export default function AttachedDocs({ docs, onDocClick }: AttachedDocsProps) {
  if (!docs || docs.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
        {t`Documents`}
      </h3>
      <div className="flex flex-wrap gap-3">
        {docs.map((doc) => (
          <button
            key={doc.publicId}
            type="button"
            onClick={() => onDocClick(doc.publicId)}
            className="group flex w-[100px] flex-col items-center gap-1.5 rounded-lg border border-light-200 bg-light-50 p-3 transition-colors hover:border-light-400 hover:bg-light-100 dark:border-dark-200 dark:bg-dark-200 dark:hover:border-dark-400 dark:hover:bg-dark-300"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-light-200 bg-light-100 group-hover:border-light-300 dark:border-dark-300 dark:bg-dark-100 dark:group-hover:border-dark-400">
              <HiDocumentText className="h-6 w-6 text-light-700 dark:text-dark-700" />
            </div>
            <span className="w-full truncate text-center text-xs font-medium text-light-900 dark:text-dark-900">
              {doc.title || "Untitled"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
