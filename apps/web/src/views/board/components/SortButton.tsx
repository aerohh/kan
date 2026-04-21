import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { HiMiniXMark, HiOutlineArrowsUpDown } from "react-icons/hi2";

import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { toolbarGlow, TOOLBAR_GLOW_PRESETS } from "./toolbarGlow";

const SortButton = ({
  isLoading,
}: {
  isLoading: boolean;
}) => {
  const router = useRouter();
  const currentSort = (router.query.sort as string) || "";

  const handleSelect = async (
    _groupKey: string | null,
    item: { key: string },
  ) => {
    const newSort = currentSort === item.key ? "" : item.key;
    try {
      await router.push({
        pathname: router.pathname,
        query: {
          ...router.query,
          sort: newSort || undefined,
          ...(newSort ? { sortDir: (router.query.sortDir as string) || "asc" } : { sortDir: undefined }),
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const clearSort = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, sort: undefined, sortDir: undefined },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const items = [
    { key: "alphabet", value: t`Alphabet`, selected: currentSort === "alphabet" },
    { key: "priority", value: t`Priority`, selected: currentSort === "priority" },
    { key: "due", value: t`Due`, selected: currentSort === "due" },
  ];

  const isActive = !!currentSort;
  const glow = toolbarGlow(isActive, TOOLBAR_GLOW_PRESETS.sort);

  return (
    <div className="group/toolbar relative">
      <CheckboxDropdown
        items={items}
        handleSelect={handleSelect}
        menuSpacing="md"
        position="left"
      >
        <Button
          variant="ghost"
          iconOnly
          disabled={isLoading}
          iconLeft={
            <HiOutlineArrowsUpDown
              size={22}
              className={glow.iconClass}
            />
          }
          className={glow.buttonClass}
        />
        {currentSort && (
          <button
            type="button"
            onClick={clearSort}
            aria-label={t`Clear sort`}
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

export default SortButton;
