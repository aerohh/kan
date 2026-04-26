export interface SheetCard {
  publicId: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  labels: { publicId: string; name: string; colourCode: string | null }[];
  members: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  attachments: { publicId: string }[];
  checklists: {
    publicId: string;
    name: string;
    items: {
      publicId: string;
      title: string;
      completed: boolean;
      index: number;
    }[];
  }[];
  comments: { publicId: string }[];
  listName: string;
  listPublicId: string;
}

export interface SheetGroup {
  name: string;
  colourCode: string | null;
  cards: SheetCard[];
}

export interface SheetViewProps {
  cards: SheetCard[];
  groups?: SheetGroup[];
  boardPublicId: string;
  isTemplate: boolean;
  onContextMenu: (e: React.MouseEvent, cardPublicId: string) => void;
  onOpenCard?: (cardPublicId: string) => void;
  boardLabels: { publicId: string; name: string; colourCode: string | null }[];
  workspaceMembers: {
    publicId: string;
    email: string;
    user: { name: string | null; email: string; image: string | null } | null;
  }[];
  allLists: { publicId: string; name: string }[];
  canEditCard: boolean;
  weekStartDay: number;
  canCreateCard: boolean;
}

export type SortColumn = "title" | "dueDate" | "progress";
export type SortDir = "asc" | "desc";
