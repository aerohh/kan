import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { HiMiniXMark, HiOutlineSquares2X2 } from "react-icons/hi2";

import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";

const GroupButton = ({
  isLoading,
}: {
  isLoading: boolean;
}) => {
  const router = useRouter();
  const currentGroup = (router.query.group as string) || "";

  const handleSelect = async (
    _groupKey: string | null,
    item: { key: string },
  ) => {
    const newGroup = currentGroup === item.key ? "" : item.key;
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, group: newGroup || undefined },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearGroup = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, group: undefined },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const items = [
    { key: "tag", value: t`Tag`, selected: currentGroup === "tag" },
    {
      key: "priority",
      value: t`Priority`,
      selected: currentGroup === "priority",
    },
  ];

  return (
    <div className="relative">
      <CheckboxDropdown
        items={items}
        handleSelect={handleSelect}
        menuSpacing="md"
        position="left"
      >
        <Button
          variant="secondary"
          disabled={isLoading}
          iconLeft={<HiOutlineSquares2X2 />}
        >
          {t`Group`}
        </Button>
        {currentGroup && (
          <button
            type="button"
            onClick={clearGroup}
            aria-label={t`Clear group`}
            className="group absolute -right-[8px] -top-[8px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            <span className="text-light-50 dark:text-dark-50">
              <HiMiniXMark size={12} />
            </span>
          </button>
        )}
      </CheckboxDropdown>
    </div>
  );
};

export default GroupButton;
