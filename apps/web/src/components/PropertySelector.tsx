import { api } from "~/utils/api";
import Badge from "~/components/Badge";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import LabelIcon from "~/components/LabelIcon";

type PropertyOption = {
  publicId: string;
  name: string;
  colourCode: string | null;
  groupId?: number;
  index?: number;
};

type PropertyGroup = {
  publicId: string;
  name: string;
  type: string;
  index?: number;
  options: PropertyOption[];
};

export function PropertySelector({
  cardPublicId,
  groups,
  cardPropertyIds,
  onMutationSettled,
  disabled = false,
}: {
  cardPublicId: string;
  groups: PropertyGroup[];
  cardPropertyIds: string[];
  onMutationSettled?: () => void;
  disabled?: boolean;
}) {
  const utils = api.useUtils();

  const addOrRemoveProperty = api.card.addOrRemoveProperty.useMutation({
    onSettled: () => {
      utils.card.byId.invalidate({ cardPublicId });
      utils.board.byId.invalidate();
      onMutationSettled?.();
    },
  });

  const handleSelect = (optionPublicId: string) => {
    addOrRemoveProperty.mutate({ cardPublicId, optionPublicId });
  };

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => {
        const selectedIds = cardPropertyIds.filter((id) =>
          group.options.some((o) => o.publicId === id),
        );

        const items = group.options.map((option) => ({
          key: option.publicId,
          value: option.name,
          selected: selectedIds.includes(option.publicId),
          leftIcon: option.colourCode ? (
            <LabelIcon colourCode={option.colourCode} />
          ) : undefined,
        }));

        const trigger = selectedIds.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedIds.map((id) => {
              const option = group.options.find((o) => o.publicId === id);
              if (!option) return null;
              return (
                <Badge
                  key={option.publicId}
                  value={option.name}
                  colourCode={option.colourCode}
                  variant="notion"
                />
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-light-800 dark:text-dark-800">
            {group.name}
          </span>
        );

        return (
          <div key={group.publicId}>
            <CheckboxDropdown
              items={items}
              handleSelect={(_, item) => handleSelect(item.key)}
              disabled={disabled}
              className="relative inline-flex items-center text-left"
            >
              {trigger}
            </CheckboxDropdown>
          </div>
        );
      })}
    </div>
  );
}
