import type { RouterInputs } from "@kan/api";
import { t } from "@lingui/core/macro";
import { generateUID } from "@kan/shared/utils";

import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

type BoardQueryParams = RouterInputs["board"]["byId"];

export function useQuickAddCard(queryParams: BoardQueryParams) {
  const utils = api.useUtils();
  const { showPopup } = usePopup();

  const createCard = api.card.create.useMutation({
    onMutate: async (args) => {
      await utils.board.byId.cancel();

      const currentState = utils.board.byId.getData(queryParams);

      utils.board.byId.setData(queryParams, (oldBoard) => {
        if (!oldBoard) return oldBoard;

        const updatedLists = oldBoard.lists.map((list) => {
          if (list.publicId === args.listPublicId) {
            const newCard = {
              publicId: `PLACEHOLDER_${generateUID()}`,
              title: args.title,
              listId: 0,
              description: "",
              dueDate: null,
              labels: [],
              members: [],
              comments: [],
              checklists: [],
              attachments: [],
              docs: [],
              _filteredLabels: [],
              _filteredMembers: [],
              index: 0,
            };

            return { ...list, cards: [newCard, ...list.cards] };
          }
          return list;
        });

        return { ...oldBoard, lists: updatedLists };
      });

      return { previousState: currentState };
    },
    onError: (err, _args, context) => {
      if (context?.previousState) {
        utils.board.byId.setData(queryParams, context.previousState);
      }
      showPopup({
        header: t`Unable to create card`,
        message: err.data?.zodError?.fieldErrors.title?.[0]
          ? `${err.data.zodError.fieldErrors.title[0].replace("String", "Title")}`
          : t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await utils.board.byId.invalidate(queryParams);
    },
  });

  return {
    createCard: (title: string, listPublicId: string) =>
      createCard.mutate({
        title,
        description: "",
        listPublicId,
        labelPublicIds: [],
        memberPublicIds: [],
        position: "start",
      }),
    isPending: createCard.isPending,
  };
}
