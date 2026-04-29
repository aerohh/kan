import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { HiMiniXMark, HiOutlineViewColumns } from "react-icons/hi2";

import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import { toolbarGlow, TOOLBAR_GLOW_PRESETS } from "./toolbarGlow";

type PropertyGroup = {
  publicId: string;
  name: string;
  type: string;
  options: {
    publicId: string;
    name: string;
    colourCode: string | null;
  }[];
};

const GroupButton = ({
  isLoading,
  propertyGroups,
}: {
  isLoading: boolean;
  propertyGroups: PropertyGroup[];
}) => {
  const router = useRouter();
  const currentGroup = (router.query.groupBy as string) || "";

  const handleSelect = async (
    _groupKey: string | null,
    item: { key: string },
  ) => {
    const newGroup = currentGroup === item.key ? "" : item.key;
    try {
      await router.push({
        pathname: router.pathname,
        query: { ...router.query, groupBy: newGroup || undefined },
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
        query: { ...router.query, groupBy: undefined },
      });
    } catch (error) {
      console.error(error);
    }
  };

  const items = propertyGroups.map((group) => ({
    key: group.publicId,
    value: group.name,
    selected: currentGroup === group.publicId,
    leftIcon: group.options[0]?.colourCode ? (
      <LabelIcon colourCode={group.options[0].colourCode} />
    ) : undefined,
  }));

  const glow = toolbarGlow(!!currentGroup, TOOLBAR_GLOW_PRESETS["group"]!);

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
            <HiOutlineViewColumns size={22} className={glow.iconClass} />
          }
          className={glow.buttonClass}
        />
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
