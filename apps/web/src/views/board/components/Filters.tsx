import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import {
  HiMiniXMark,
  HiOutlineClock,
  HiOutlineFunnel,
  HiOutlineUserCircle,
} from "react-icons/hi2";

import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";
import {
  formatMemberDisplayName,
  formatToArray,
  getAvatarUrl,
} from "~/utils/helpers";
import { toolbarGlow, TOOLBAR_GLOW_PRESETS } from "./toolbarGlow";

interface Member {
  publicId: string;
  user: {
    name: string | null;
    image: string | null;
    email: string;
  } | null;
}

interface PropertyGroup {
  publicId: string;
  name: string;
  type: string;
  showOnCard: boolean;
  options: {
    publicId: string;
    name: string;
    colourCode: string | null;
  }[];
}

const Filters = ({
  position = "right",
  members,
  propertyGroups,
  isLoading,
}: {
  position?: "left" | "right";
  members: Member[];
  propertyGroups: PropertyGroup[];
  isLoading: boolean;
}) => {
  const router = useRouter();

  const clearFilters = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();

    try {
      const query = { ...router.query };
      delete query.members;
      delete query.properties;
      delete query.dueDate;

      await router.push({
        pathname: router.pathname,
        query,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const formattedMembers = members.map((member) => ({
    key: member.publicId,
    value: formatMemberDisplayName(
      member.user?.name ?? null,
      member.user?.email ?? null,
    ),
    selected: !!router.query.members?.includes(member.publicId),
    leftIcon: (
      <Avatar
        size="xs"
        name={member.user?.name ?? ""}
        imageUrl={
          member.user?.image ? getAvatarUrl(member.user.image) : undefined
        }
        email={member.user?.email ?? ""}
      />
    ),
  }));

  const propertyFilterGroups = propertyGroups.map((group) => ({
    key: `prop_${group.publicId}`,
    label: group.name,
    icon: (
      <LabelIcon
        colourCode={group.options[0]?.colourCode ?? "#6366f1"}
      />
    ),
    items: group.options.map((option) => ({
      key: option.publicId,
      value: option.name,
      selected: !!router.query.properties?.includes(option.publicId),
      leftIcon: option.colourCode ? (
        <LabelIcon colourCode={option.colourCode} />
      ) : undefined,
    })),
  }));

  const dueDateItems = [
    {
      key: "overdue",
      value: t`Overdue`,
      selected: !!router.query.dueDate?.includes("overdue"),
    },
    {
      key: "today",
      value: t`Due today`,
      selected: !!router.query.dueDate?.includes("today"),
    },
    {
      key: "tomorrow",
      value: t`Due tomorrow`,
      selected: !!router.query.dueDate?.includes("tomorrow"),
    },
    {
      key: "next-week",
      value: t`Due next week`,
      selected: !!router.query.dueDate?.includes("next-week"),
    },
    {
      key: "next-month",
      value: t`Due next month`,
      selected: !!router.query.dueDate?.includes("next-month"),
    },
    {
      key: "no-due-date",
      value: t`No dates`,
      selected: !!router.query.dueDate?.includes("no-due-date"),
    },
  ];

  const groups = [
    ...(formattedMembers.length
      ? [
          {
            key: "members",
            label: t`Members`,
            icon: <HiOutlineUserCircle size={16} />,
            items: formattedMembers,
          },
        ]
      : []),
    ...propertyFilterGroups,
    {
      key: "dueDate",
      label: t`Due date`,
      icon: <HiOutlineClock size={16} />,
      items: dueDateItems,
    },
  ];

  const handleSelect = async (
    groupKey: string | null,
    item: { key: string },
  ) => {
    if (groupKey === null) return;

    if (groupKey === "members" || groupKey === "dueDate") {
      const currentQuery = router.query[groupKey] ?? [];
      const formattedCurrentQuery = Array.isArray(currentQuery)
        ? currentQuery
        : [currentQuery];

      const updatedQuery = formattedCurrentQuery.includes(item.key)
        ? formattedCurrentQuery.filter((key) => key !== item.key)
        : [...formattedCurrentQuery, item.key];

      try {
        await router.push({
          pathname: router.pathname,
          query: { ...router.query, [groupKey]: updatedQuery },
        });
      } catch (error) {
        console.error(error);
      }
      return;
    }

    if (groupKey.startsWith("prop_")) {
      const currentProperties = formatToArray(router.query.properties);
      const updatedProperties = currentProperties.includes(item.key)
        ? currentProperties.filter((key) => key !== item.key)
        : [...currentProperties, item.key];

      try {
        await router.push({
          pathname: router.pathname,
          query: {
            ...router.query,
            properties: updatedProperties.length
              ? updatedProperties
              : undefined,
          },
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const numOfFilters = [
    ...formatToArray(router.query.members),
    ...formatToArray(router.query.properties),
    ...formatToArray(router.query.dueDate),
  ].length;

  const glow = toolbarGlow(
    numOfFilters > 0,
    TOOLBAR_GLOW_PRESETS["filter"]!,
  );

  return (
    <div className="group/toolbar relative">
      <CheckboxDropdown
        groups={groups}
        handleSelect={handleSelect}
        handleReset={clearFilters}
        menuSpacing="md"
        position={position}
      >
        <Button
          variant="ghost"
          iconOnly
          disabled={isLoading}
          iconLeft={
            <HiOutlineFunnel size={22} className={glow.iconClass} />
          }
          className={glow.buttonClass}
        />
        {numOfFilters > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            aria-label={t`Clear filters`}
            className="group absolute -right-[8px] -top-[8px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-light-100 bg-light-1000 text-[8px] font-[700] text-light-600 dark:border-dark-50 dark:bg-dark-1000 dark:text-dark-600"
          >
            <span className="group-hover:hidden">{numOfFilters}</span>
            <span className="hidden text-light-50 group-hover:inline dark:text-dark-50">
              <HiMiniXMark size={12} />
            </span>
          </button>
        )}
      </CheckboxDropdown>
    </div>
  );
};

export default Filters;
