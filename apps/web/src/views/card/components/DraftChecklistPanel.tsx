import { t } from "@lingui/core/macro";
import { useState } from "react";
import { HiPlus, HiXMark } from "react-icons/hi2";
import { generateUID } from "@kan/shared/utils";

interface DraftChecklistItem {
  tempId: string;
  title: string;
  completed: boolean;
}

interface DraftChecklist {
  tempId: string;
  name: string;
  items: DraftChecklistItem[];
}

interface DraftChecklistPanelProps {
  checklists: DraftChecklist[];
  onChange: (checklists: DraftChecklist[]) => void;
}

export default function DraftChecklistPanel({
  checklists,
  onChange,
}: DraftChecklistPanelProps) {
  const [newItemText, setNewItemText] = useState<Record<string, string>>({});
  const [activeChecklistForm, setActiveChecklistForm] = useState<string | null>(null);

  const addChecklist = () => {
    const newChecklist: DraftChecklist = {
      tempId: `draft_cl_${generateUID()}`,
      name: `Checklist ${checklists.length + 1}`,
      items: [],
    };
    onChange([...checklists, newChecklist]);
    setActiveChecklistForm(newChecklist.tempId);
  };

  const removeChecklist = (tempId: string) => {
    onChange(checklists.filter((cl) => cl.tempId !== tempId));
  };

  const renameChecklist = (tempId: string, name: string) => {
    onChange(
      checklists.map((cl) => (cl.tempId === tempId ? { ...cl, name } : cl)),
    );
  };

  const addChecklistItem = (checklistTempId: string) => {
    const text = newItemText[checklistTempId]?.trim();
    if (!text) return;
    onChange(
      checklists.map((cl) =>
        cl.tempId === checklistTempId
          ? {
              ...cl,
              items: [
                ...cl.items,
                {
                  tempId: `draft_item_${generateUID()}`,
                  title: text,
                  completed: false,
                },
              ],
            }
          : cl,
      ),
    );
    setNewItemText((prev) => ({ ...prev, [checklistTempId]: "" }));
  };

  const removeChecklistItem = (checklistTempId: string, itemTempId: string) => {
    onChange(
      checklists.map((cl) =>
        cl.tempId === checklistTempId
          ? {
              ...cl,
              items: cl.items.filter((item) => item.tempId !== itemTempId),
            }
          : cl,
      ),
    );
  };

  const toggleChecklistItem = (checklistTempId: string, itemTempId: string) => {
    onChange(
      checklists.map((cl) =>
        cl.tempId === checklistTempId
          ? {
              ...cl,
              items: cl.items.map((item) =>
                item.tempId === itemTempId
                  ? { ...item, completed: !item.completed }
                  : item,
              ),
            }
          : cl,
      ),
    );
  };

  const updateChecklistItemTitle = (
    checklistTempId: string,
    itemTempId: string,
    title: string,
  ) => {
    onChange(
      checklists.map((cl) =>
        cl.tempId === checklistTempId
          ? {
              ...cl,
              items: cl.items.map((item) =>
                item.tempId === itemTempId ? { ...item, title } : item,
              ),
            }
          : cl,
      ),
    );
  };

  return (
    <div className="h-full min-h-0 w-[360px] overflow-y-auto border-l-[1px] border-light-300 bg-light-100 p-8 text-light-900 dark:border-dark-300 dark:bg-dark-100 dark:text-dark-900">
      <div className="pt-[18px]">
        <div className="flex items-center justify-between pb-4">
          <h2 className="pb-4 text-xs font-semibold uppercase tracking-wider text-light-800 dark:text-dark-800">
            {t`Checklists`}
          </h2>
          <button
            type="button"
            onClick={addChecklist}
            className="rounded-md p-1 text-light-900 hover:bg-light-100 dark:text-dark-700 dark:hover:bg-dark-100"
          >
            <HiPlus className="h-4 w-4" />
          </button>
        </div>

          {checklists.map((checklist) => {
          const completedItems = checklist.items.filter((item) => item.completed);

          return (
            <div key={checklist.tempId} className="mb-3 rounded-lg border border-light-300 bg-light-50 p-3 dark:border-dark-300 dark:bg-dark-50">
              <div className="mb-2 flex items-center font-medium text-light-1000 dark:text-dark-1000">
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={checklist.name}
                    onChange={(e) => renameChecklist(checklist.tempId, e.target.value)}
                    className="w-full border-0 bg-transparent p-0 text-sm font-medium text-light-1000 focus:outline-none focus:ring-0 dark:text-dark-1000"
                  />
                </div>
                <div className="ml-2 flex flex-shrink-0 items-center gap-2">
                  <div className="flex items-center gap-1 rounded-full border-[1px] border-light-300 px-2 py-1 dark:border-dark-300">
                    <span className="text-[11px] text-light-900 dark:text-dark-700">
                      {completedItems.length}/{checklist.items.length}
                    </span>
                  </div>
                  <button
                    className="rounded-md p-1 text-light-900 hover:bg-light-100 dark:text-dark-700 dark:hover:bg-dark-100"
                    onClick={() => removeChecklist(checklist.tempId)}
                  >
                    <HiXMark size={16} />
                  </button>
                  <button
                    onClick={() => setActiveChecklistForm(checklist.tempId)}
                    className="rounded-md p-1 text-light-900 hover:bg-light-100 dark:text-dark-700 dark:hover:bg-dark-100"
                  >
                    <HiPlus size={16} />
                  </button>
                </div>
              </div>

              {checklist.items.length > 0 && (
                <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-light-300 dark:bg-dark-300">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
                    style={{
                      width: `${checklist.items.length > 0 ? (completedItems.length / checklist.items.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}

              <div className="ml-1">
                {checklist.items.map((item) => (
                  <div
                    key={item.tempId}
                    className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-light-100 dark:hover:bg-dark-100"
                  >
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() =>
                        toggleChecklistItem(checklist.tempId, item.tempId)
                      }
                      className="h-[18px] w-[18px] rounded border-light-400 dark:border-dark-400"
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) =>
                        updateChecklistItemTitle(
                          checklist.tempId,
                          item.tempId,
                          e.target.value,
                        )
                      }
                      className={`flex-1 border-0 bg-transparent p-0 text-base text-light-1000 focus:outline-none focus:ring-0 dark:text-dark-1000 ${item.completed ? "line-through text-light-800 dark:text-dark-800" : ""}`}
                    />
                    <button
                      onClick={() =>
                        removeChecklistItem(checklist.tempId, item.tempId)
                      }
                      className="hidden rounded-md p-1 text-light-900 hover:bg-light-200 group-hover:block dark:text-dark-700 dark:hover:bg-dark-200"
                    >
                      <HiXMark size={18} />
                    </button>
                  </div>
                ))}

                {activeChecklistForm === checklist.tempId && (
                  <div className="flex items-center gap-2 px-1 py-1">
                    <input
                      type="checkbox"
                      disabled
                      className="h-[18px] w-[18px] rounded border-light-400 dark:border-dark-400"
                    />
                    <input
                      type="text"
                      value={newItemText[checklist.tempId] ?? ""}
                      onChange={(e) =>
                        setNewItemText((prev) => ({
                          ...prev,
                          [checklist.tempId]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChecklistItem(checklist.tempId);
                        }
                        if (e.key === "Escape") {
                          setActiveChecklistForm(null);
                        }
                      }}
                      onBlur={() => {
                        addChecklistItem(checklist.tempId);
                        setActiveChecklistForm(null);
                      }}
                      placeholder={t`Add item`}
                      autoFocus
                      className="flex-1 border-0 bg-transparent p-0 text-base text-light-1000 focus:outline-none focus:ring-0 dark:text-dark-1000"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { DraftChecklist, DraftChecklistItem };
