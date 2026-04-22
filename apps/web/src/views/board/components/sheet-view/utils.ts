import type { SheetCard, SortColumn, SortDir } from "./types";

interface ChecklistsForProgress {
  checklists: { items: { completed: boolean }[] }[];
}

export function getCardProgress(card: ChecklistsForProgress): number {
  const total = card.checklists.reduce((a, cl) => a + cl.items.length, 0);
  if (total === 0) return -1;
  const done = card.checklists.reduce(
    (a, cl) => a + cl.items.filter((i) => i.completed).length,
    0,
  );
  return Math.round((done / total) * 100);
}

export function sortCards(
  cards: SheetCard[],
  col: SortColumn | null,
  dir: SortDir,
): SheetCard[] {
  if (!col) return cards;
  return [...cards].sort((a, b) => {
    let cmp = 0;
    if (col === "title") {
      cmp = a.title.localeCompare(b.title);
    } else if (col === "dueDate") {
      if (!a.dueDate && !b.dueDate) cmp = 0;
      else if (!a.dueDate) cmp = 1;
      else if (!b.dueDate) cmp = -1;
      else cmp = a.dueDate.getTime() - b.dueDate.getTime();
    } else {
      cmp = getCardProgress(a) - getCardProgress(b);
    }
    return dir === "desc" ? -cmp : cmp;
  });
}
