import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import DocsView from "~/views/docs";

const DocsPage: NextPageWithLayout = () => {
  return (
    <>
      <DocsView />
      <Popup />
    </>
  );
};

DocsPage.getLayout = (page) => getDashboardLayout(page);

export default DocsPage;
