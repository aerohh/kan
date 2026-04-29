import { Transition } from "@headlessui/react";
import { useTheme } from "next-themes";
import {
  HiChevronDown,
  HiPlus,
  HiTrash,
  HiXMark,
} from "react-icons/hi2";
import { Fragment, useState, useRef, useEffect, useCallback } from "react";

import { colours, resolveColour } from "@kan/shared/constants";
import { api } from "~/utils/api";

interface PropertyOption {
  publicId: string;
  name: string;
  colourCode: string | null;
}

interface PropertyGroup {
  publicId: string;
  name: string;
  type: string;
  options: PropertyOption[];
}

function reorderColours(
  allColours: typeof colours,
  selectedCode: string,
) {
  const idx = allColours.findIndex((c) => c.code === selectedCode);
  if (idx <= 0) return allColours;
  return [
    allColours[idx],
    ...allColours.slice(0, idx),
    ...allColours.slice(idx + 1),
  ];
}

export function PropertyGroupManager({
  boardPublicId,
  groups,
  onClose,
}: {
  boardPublicId: string;
  groups: PropertyGroup[];
  onClose: () => void;
}) {
  const utils = api.useUtils();
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    groups[0]?.publicId ?? null,
  );
  const [addingGroup, setAddingGroup] = useState(false);

  const invalidate = useCallback(() => {
    void utils.board.byId.invalidate();
    void utils.propertyGroup.list.invalidate({ boardPublicId });
  }, [utils, boardPublicId]);

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center justify-between border-b border-light-200 px-5 py-4 dark:border-dark-700">
        <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-dark-1000">
          Properties
        </h2>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-light-800 transition-colors hover:bg-light-200 hover:text-light-950 dark:text-dark-900 dark:hover:bg-dark-400 dark:hover:text-dark-1000"
        >
          <HiXMark size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {groups.map((group) => (
          <GroupItem
            key={group.publicId}
            group={group}
            isExpanded={expandedGroupId === group.publicId}
            onToggle={() =>
              setExpandedGroupId((prev) =>
                prev === group.publicId ? null : group.publicId,
              )
            }
            onInvalidated={invalidate}
          />
        ))}

        {groups.length === 0 && !addingGroup && (
          <p className="py-6 text-center text-[13px] text-light-800 dark:text-dark-900">
            No properties yet
          </p>
        )}

        {addingGroup ? (
          <AddGroupInline
            boardPublicId={boardPublicId}
            onCreated={() => {
              setAddingGroup(false);
              invalidate();
            }}
            onCancel={() => setAddingGroup(false)}
          />
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] text-light-800 transition-colors hover:bg-light-100 hover:text-light-950 dark:text-dark-900 dark:hover:bg-dark-300 dark:hover:text-dark-1000"
          >
            <HiPlus size={14} />
            Add a group
          </button>
        )}
      </div>
    </div>
  );
}

function GroupItem({
  group,
  isExpanded,
  onToggle,
  onInvalidated,
}: {
  group: PropertyGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onInvalidated: () => void;
}) {
  const [addingOption, setAddingOption] = useState(false);

  const updateGroup = api.propertyGroup.update.useMutation({
    onSettled: onInvalidated,
  });
  const deleteGroup = api.propertyGroup.delete.useMutation({
    onSettled: onInvalidated,
  });

  return (
    <div className="group/grp mb-0.5">
      <div className="flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors hover:bg-light-100 dark:hover:bg-dark-300">
        <button
          onClick={onToggle}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-light-800 transition-colors hover:bg-light-300 dark:text-dark-800 dark:hover:bg-dark-500"
        >
          <HiChevronDown
            size={14}
            className={`transform transition-transform duration-200 ${
              isExpanded ? "" : "-rotate-90"
            }`}
          />
        </button>

        <InlineEdit
          value={group.name}
          onSave={(name) => {
            if (name.trim() && name !== group.name)
              updateGroup.mutate({
                groupPublicId: group.publicId,
                name: name.trim(),
              });
          }}
          className="flex-1 text-[13px] font-medium text-neutral-900 dark:text-dark-1000"
        />

        <button
          onClick={() => {
            updateGroup.mutate({
              groupPublicId: group.publicId,
              type:
                group.type === "single-select"
                  ? "multi-select"
                  : "single-select",
            });
          }}
          className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-light-800 transition-colors hover:bg-light-300 hover:text-light-950 dark:text-dark-800 dark:hover:bg-dark-500 dark:hover:text-dark-1000"
        >
          {group.type === "single-select" ? "Single" : "Multi"}
        </button>

        <button
          onClick={() =>
            deleteGroup.mutate({ groupPublicId: group.publicId })
          }
          className="shrink-0 rounded p-1 text-light-700 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/grp:opacity-100 dark:text-dark-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <HiTrash size={13} />
        </button>
      </div>

      <Transition
        show={isExpanded}
        as={Fragment}
        enter="transition-all duration-200 ease-out"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition-all duration-150 ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <div className="ml-5 border-l border-light-300 pl-3 dark:border-dark-600">
          {group.options.map((option) => (
            <OptionRow
              key={option.publicId}
              option={option}
              onInvalidated={onInvalidated}
            />
          ))}

          {addingOption ? (
            <AddOptionInline
              groupPublicId={group.publicId}
              existingColors={group.options.map((o) => o.colourCode)}
              onCreated={() => {
                setAddingOption(false);
                onInvalidated();
              }}
              onCancel={() => setAddingOption(false)}
            />
          ) : (
            <button
              onClick={() => setAddingOption(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] text-light-800 transition-colors hover:bg-light-100 hover:text-light-950 dark:text-dark-800 dark:hover:bg-dark-300 dark:hover:text-dark-1000"
            >
              <HiPlus size={11} />
              Add option
            </button>
          )}
        </div>
      </Transition>
    </div>
  );
}

function OptionRow({
  option,
  onInvalidated,
}: {
  option: PropertyOption;
  onInvalidated: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const updateOption = api.propertyOption.update.useMutation({
    onSettled: onInvalidated,
  });
  const deleteOption = api.propertyOption.delete.useMutation({
    onSettled: onInvalidated,
  });

  const currentColour = resolveColour(option.colourCode, isDark);
  const orderedColours = reorderColours(colours, option.colourCode ?? colours[0].code);

  return (
    <div className="group/opt relative flex flex-col">
      <Transition
        show={pickerOpen}
        as={Fragment}
        enter="transition-[max-height,opacity] duration-200 ease-out"
        enterFrom="max-h-0 opacity-0"
        enterTo="max-h-12 opacity-100"
        leave="transition-[max-height,opacity] duration-150 ease-in"
        leaveFrom="max-h-12 opacity-100"
        leaveTo="max-h-0 opacity-0"
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 pb-1 pt-0.5">
            {orderedColours.map((colour, i) => {
              const displayCode = isDark ? colour.darkCode : colour.lightCode;
              return (
                <button
                  key={colour.code}
                  onClick={() => {
                    if (option.colourCode !== colour.code) {
                      updateOption.mutate({
                        optionPublicId: option.publicId,
                        colourCode: colour.code,
                      });
                    }
                    setPickerOpen(false);
                  }}
                  className="animate-color-expand shrink-0 rounded-full p-0.5 transition-transform hover:scale-110"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15 ${
                      option.colourCode === colour.code
                        ? "ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-dark-300"
                        : ""
                    }`}
                    style={{ backgroundColor: displayCode }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </Transition>

      <div className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-light-100 dark:hover:bg-dark-300">
        <button
          onClick={() => setPickerOpen((p) => !p)}
          className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10"
        >
          <span
            className="inline-block h-4 w-4 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/20"
            style={{ backgroundColor: currentColour }}
          />
        </button>

        <InlineEdit
          value={option.name}
          onSave={(name) => {
            if (name.trim() && name !== option.name)
              updateOption.mutate({
                optionPublicId: option.publicId,
                name: name.trim(),
              });
          }}
          className="flex-1 text-[13px] text-neutral-800 dark:text-dark-950"
        />

        <button
          onClick={() =>
            deleteOption.mutate({ optionPublicId: option.publicId })
          }
          className="shrink-0 rounded p-0.5 text-light-700 opacity-0 transition-all hover:text-red-500 group-hover/opt:opacity-100 dark:text-dark-700 dark:hover:text-red-400"
        >
          <HiXMark size={13} />
        </button>
      </div>
    </div>
  );
}

function AddGroupInline({
  boardPublicId,
  onCreated,
  onCancel,
}: {
  boardPublicId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"single-select" | "multi-select">(
    "single-select",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const createGroup = api.propertyGroup.create.useMutation({
    onSuccess: onCreated,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (name.trim())
      createGroup.mutate({ boardPublicId, name: name.trim(), type });
  };

  return (
    <div className="mt-1 rounded-lg border border-light-300 bg-light-50 p-3 dark:border-dark-600 dark:bg-dark-300">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Group name"
        className="w-full rounded-md border border-light-400 bg-white px-2.5 py-1.5 text-[13px] text-neutral-900 placeholder:text-light-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-dark-500 dark:bg-dark-200 dark:text-dark-950 dark:placeholder:text-dark-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
      />
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex gap-1">
          {(["single-select", "multi-select"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                type === t
                  ? "bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-800"
                  : "text-light-800 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-400"
              }`}
            >
              {t === "single-select" ? "Single select" : "Multi select"}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onCancel}
            className="rounded-md px-2.5 py-1 text-[12px] text-light-800 transition-colors hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-400"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || createGroup.isPending}
            className="rounded-md bg-indigo-500 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function AddOptionInline({
  groupPublicId,
  existingColors,
  onCreated,
  onCancel,
}: {
  groupPublicId: string;
  existingColors: (string | null)[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [colourCode, setColourCode] = useState(() => {
    const used = new Set(existingColors);
    return (
      colours.find((c) => !used.has(c.code))?.code ??
      colours[0]?.code ??
      "#4f46e5"
    );
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const createOption = api.propertyOption.create.useMutation({
    onSuccess: onCreated,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (name.trim())
      createOption.mutate({
        groupPublicId,
        name: name.trim(),
        colourCode,
      });
  };

  const displayColour = resolveColour(colourCode, isDark);
  const orderedColours = reorderColours(colours, colourCode);

  return (
    <div className="relative flex flex-col">
      <Transition
        show={pickerOpen}
        as={Fragment}
        enter="transition-[max-height,opacity] duration-200 ease-out"
        enterFrom="max-h-0 opacity-0"
        enterTo="max-h-12 opacity-100"
        leave="transition-[max-height,opacity] duration-150 ease-in"
        leaveFrom="max-h-12 opacity-100"
        leaveTo="max-h-0 opacity-0"
      >
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 pb-1 pt-0.5">
            {orderedColours.map((colour, i) => {
              const displayCode = isDark ? colour.darkCode : colour.lightCode;
              return (
                <button
                  key={colour.code}
                  onClick={() => {
                    setColourCode(colour.code);
                    setPickerOpen(false);
                  }}
                  className="animate-color-expand shrink-0 rounded-full p-0.5 transition-transform hover:scale-110"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15 ${
                      colourCode === colour.code
                        ? "ring-2 ring-indigo-400 ring-offset-1 dark:ring-offset-dark-300"
                        : ""
                    }`}
                    style={{ backgroundColor: displayCode }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </Transition>

      <div className="flex items-center gap-2 rounded-md px-2 py-1">
        <button
          onClick={() => setPickerOpen((p) => !p)}
          className="shrink-0 rounded-full transition-shadow hover:ring-2 hover:ring-black/10 dark:hover:ring-white/10"
        >
          <span
            className="inline-block h-4 w-4 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/20"
            style={{ backgroundColor: displayColour }}
          />
        </button>

        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Option name"
          className="flex-1 rounded border border-light-400 bg-white px-2 py-0.5 text-[13px] text-neutral-900 placeholder:text-light-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-dark-500 dark:bg-dark-200 dark:text-dark-950 dark:placeholder:text-dark-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
        />
      </div>
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        className="w-full rounded border border-light-400 bg-white px-1.5 py-0.5 text-[13px] text-neutral-900 placeholder:text-light-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-dark-500 dark:bg-dark-200 dark:text-dark-950 dark:placeholder:text-dark-700 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={`cursor-text select-none rounded px-1 py-0.5 transition-colors hover:bg-light-300/60 dark:hover:bg-dark-600/50 ${className ?? ""}`}
    >
      {value}
    </span>
  );
}
