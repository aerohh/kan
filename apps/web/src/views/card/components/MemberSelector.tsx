import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import Avatar from "~/components/Avatar";
import CheckboxDropdown from "~/components/CheckboxDropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface MemberSelectorProps {
  cardPublicId: string;
  members: {
    key: string;
    value: string;
    selected: boolean;
    leftIcon: React.ReactNode;
    imageUrl: string | undefined;
  }[];
  isLoading: boolean;
  disabled?: boolean;
}

export default function MemberSelector({
  cardPublicId,
  members,
  isLoading,
  disabled = false,
}: MemberSelectorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { openModal } = useModal();
  const { showPopup } = usePopup();

  const addOrRemoveMember = api.card.addOrRemoveMember.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        const hasMember = oldCard.members.some(
          (member) => member.publicId === update.workspaceMemberPublicId,
        );

        const memberToAdd = oldCard.members.find(
          (member) => member.publicId === update.workspaceMemberPublicId,
        );

        const updatedMembers = hasMember
          ? oldCard.members.filter(
              (member) => member.publicId !== update.workspaceMemberPublicId,
            )
          : [
              ...oldCard.members,
              {
                publicId: update.workspaceMemberPublicId,
                email: memberToAdd?.email ?? "",
                deletedAt: null,
                user: {
                  id: memberToAdd?.user?.id ?? "",
                  name: memberToAdd?.user?.name ?? "",
                },
              },
            ];

        return {
          ...oldCard,
          members: updatedMembers,
        };
      });

      return { previousCard };
    },
    onError: (_error, _newList, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update members`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  const selectedMembers = members.filter((member) => member.selected);

  const handleInviteMember = async () => {
    await router.push(`/members`);
    openModal("INVITE_MEMBER");
  };

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-[125px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
        </div>
      ) : (
        <CheckboxDropdown
          items={members}
          handleSelect={(_, member) => {
            addOrRemoveMember.mutate({
              cardPublicId,
              workspaceMemberPublicId: member.key,
            });
          }}
          handleCreate={disabled ? undefined : handleInviteMember}
          createNewItemLabel={t`Invite member`}
          disabled={disabled}
          asChild
          className="relative inline-flex items-center text-left"
        >
          {selectedMembers.length ? (
            <div className="flex h-auto flex-wrap items-center gap-0.5 overflow-hidden">
              <div className="isolate flex flex-wrap -space-x-1.5 overflow-hidden">
                {selectedMembers.map(({ value, imageUrl }) => (
                  <Avatar
                    key={value}
                    size="xs"
                    name={value}
                    imageUrl={imageUrl}
                    email={value}
                  />
                ))}
              </div>
            </div>
          ) : (
            <span className={`inline-flex h-6 items-center cursor-pointer rounded bg-light-300 px-1.5 py-0.5 text-[11px] font-medium text-neutral-600 hover:bg-light-400 dark:bg-dark-300 dark:text-dark-800 dark:hover:bg-dark-400 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
              {t`Members`}
            </span>
          )}
        </CheckboxDropdown>
      )}
    </>
  );
}
