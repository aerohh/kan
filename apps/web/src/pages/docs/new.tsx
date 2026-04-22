import type { NextPageWithLayout } from "../_app";
import { useRouter } from "next/router";
import { HiArrowLeft } from "react-icons/hi2";

import { getDashboardLayout } from "~/components/Dashboard";
import DocEditor from "~/views/docs/components/DocEditor";

const NewDocPage: NextPageWithLayout = () => {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-light-200 bg-light-50 px-4 py-2 dark:border-dark-200 dark:bg-dark-50">
        <button
          onClick={() => router.push("/docs")}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-sm text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200"
        >
          <HiArrowLeft className="h-4 w-4" />
          <span>Docs</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <DocEditor />
      </div>
    </div>
  );
};

NewDocPage.getLayout = (page) => getDashboardLayout(page);

export default NewDocPage;
