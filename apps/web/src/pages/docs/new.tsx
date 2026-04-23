import type { NextPageWithLayout } from "../_app";
import { useRouter } from "next/router";
import { HiArrowLeft } from "react-icons/hi2";

import { getDashboardLayout } from "~/components/Dashboard";
import DocEditor from "~/views/docs/components/DocEditor";

const NewDocPage: NextPageWithLayout = () => {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center bg-light-50 px-4 py-1.5 dark:bg-dark-50">
        <button
          onClick={() => router.push("/docs")}
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-light-800 transition-colors hover:bg-light-200 hover:text-light-900 dark:text-dark-800 dark:hover:bg-dark-200 dark:hover:text-dark-900"
        >
          <HiArrowLeft className="h-3.5 w-3.5" />
          <span>Docs</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <DocEditor />
      </div>
    </div>
  );
};

NewDocPage.getLayout = (page) => getDashboardLayout(page);

export default NewDocPage;
