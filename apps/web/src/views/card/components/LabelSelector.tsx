import { t } from "@lingui/core/macro";
import { useTheme } from "next-themes";
import { resolveColour } from "@kan/shared/constants";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface LabelSelectorProps {
  cardPublicId: string;
  labels: {
    key: string;
    value: string;
    selected: boolean;
    leftIcon: React.ReactNode;
    colourCode?: string | null;
  }[];
  isLoading: boolean;
  disabled?: boolean;
}

export default function LabelSelector({
  cardPublicId,
  labels,
  isLoading,
  disabled = false,
}: LabelSelectorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const utils = api.useUtils();
  const { openModal } = useModal();
  const { showPopup } = usePopup();

  const addOrRemoveLabel = api.card.addOrRemoveLabel.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        const hasLabel = oldCard.labels.some(
          (label) => label.publicId === update.labelPublicId,
        );

        const labelToAdd = oldCard.labels.find(
          (label) => label.publicId === update.labelPublicId,
        );

        const updatedLabels = hasLabel
          ? oldCard.labels.filter(
              (label) => label.publicId !== update.labelPublicId,
            )
          : [
              ...oldCard.labels,
              {
                publicId: update.labelPublicId,
                name: labelToAdd?.name ?? "",
                colourCode: labelToAdd?.colourCode ?? "",
              },
            ];

        return {
          ...oldCard,
          labels: updatedLabels,
        };
      });

      return { previousCard };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update labels`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const selectedLabels = labels.filter((label) => label.selected);

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-[175px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
        </div>
      ) : (
        <CheckboxDropdown
          items={labels}
          handleSelect={(_, label) => {
            addOrRemoveLabel.mutate({ cardPublicId, labelPublicId: label.key });
          }}
          handleEdit={disabled ? undefined : (labelPublicId) => openModal("EDIT_LABEL", labelPublicId)}
          handleCreate={disabled ? undefined : () => openModal("NEW_LABEL")}
          createNewItemLabel={t`Create new label`}
          disabled={disabled}
          asChild
          className="relative inline-flex items-center text-left"
        >
          {selectedLabels.length ? (
            <div className="flex h-auto flex-wrap items-center gap-1">
              {selectedLabels.map((label) => {
                const resolved = resolveColour(label.colourCode, isDark);
                return (
                  <span
                    key={label.key}
                    className="inline-flex h-6 max-w-[120px] items-center truncate rounded-full border-2 px-2 text-[10px] font-medium leading-none text-neutral-600 dark:text-dark-1000"
                    style={{
                      backgroundColor: `${resolved}25`,
                      borderColor: `${resolved}30`,
                    }}
                  >
                    {label.value}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className={`inline-flex h-6 items-center cursor-pointer rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
              {t`Labels`}
            </span>
          )}
        </CheckboxDropdown>
      )}
    </>
  );
}
