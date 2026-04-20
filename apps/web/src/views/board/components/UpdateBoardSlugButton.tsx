import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { HiLink } from "react-icons/hi";

import Button from "~/components/Button";
import { Tooltip } from "~/components/Tooltip";
import { usePopup } from "~/providers/popup";

const linkBaseUrl = env("NEXT_PUBLIC_BASE_URL");

const UpdateBoardSlugButton = ({
  handleOnClick,
  workspaceSlug,
  boardSlug,
  boardPublicId,
  visibility,
  isLoading,
  canEdit,
}: {
  handleOnClick: () => void;
  workspaceSlug: string;
  boardSlug: string;
  boardPublicId: string;
  visibility: "public" | "private";
  isLoading: boolean;
  canEdit: boolean;
}) => {
  const { showPopup } = usePopup();

  if (isLoading) {
    return (
      <div className="hidden h-9 w-9 animate-pulse rounded-md bg-light-200 dark:bg-dark-100 xl:flex" />
    );
  }

  if (!workspaceSlug || !boardSlug || !boardPublicId) return <></>;

  const isPublic = visibility === "public";
  const boardUrl = isPublic
    ? `${linkBaseUrl}/${workspaceSlug}/${boardSlug}`
    : `${linkBaseUrl}/boards/${boardPublicId}`;

  return (
    <Tooltip
      content={!canEdit ? t`You don't have permission` : t`Copy board link`}
    >
      <Button
        variant="ghost"
        iconOnly
        iconLeft={<HiLink className="h-[22px] w-[22px]" />}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          if (canEdit) {
            e.preventDefault();
            navigator.clipboard.writeText(boardUrl).then(
              () =>
                showPopup({
                  header: t`Link copied`,
                  icon: "success",
                  message: t`Board URL copied to clipboard`,
                }),
            ).catch(() => undefined);
          }
        }}
        disabled={!canEdit || isLoading}
        className="hidden xl:flex"
      />
    </Tooltip>
  );
};

export default UpdateBoardSlugButton;
