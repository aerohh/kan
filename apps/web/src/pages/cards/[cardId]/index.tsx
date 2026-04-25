import type { NextPageWithLayout } from "~/pages/_app";
import { getDashboardLayout } from "~/components/Dashboard";
import Popup from "~/components/Popup";
import PanelOrchestrator from "~/components/PanelOrchestrator";
import CardView from "~/views/card";
import { CardPanelsProvider } from "~/providers/card-panels";

const CardPage: NextPageWithLayout = () => {
  return (
    <>
      <CardView />
      <Popup />
    </>
  );
};

CardPage.getLayout = (page) =>
  getDashboardLayout(
    page,
    <PanelOrchestrator />,
    true,
    CardPanelsProvider,
  );

export default CardPage;
