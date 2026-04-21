import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { HiOutlineQueueList } from "react-icons/hi2";

import Button from "~/components/Button";
import { Tooltip } from "~/components/Tooltip";

const ViewSwitchButton = ({
  isLoading,
}: {
  isLoading: boolean;
}) => {
  const router = useRouter();
  const currentView = (router.query.view as string) || "kanban";
  const isSheet = currentView === "sheet";

  const handleToggle = async () => {
    const newView = isSheet ? "kanban" : "sheet";
    try {
      await router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          view: newView === "kanban" ? undefined : newView,
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Tooltip content={isSheet ? t`Switch to board view` : t`Switch to sheet view`}>
      <Button
        variant="ghost"
        iconOnly
        disabled={isLoading}
        onClick={handleToggle}
        iconLeft={
          <HiOutlineQueueList
            size={22}
            className={
              isSheet
                ? "text-violet-500 dark:text-violet-400"
                : "text-light-800 dark:text-dark-800"
            }
          />
        }
      />
    </Tooltip>
  );
};

export default ViewSwitchButton;
