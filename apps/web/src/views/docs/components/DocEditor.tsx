import type { Range as TiptapRange } from "@tiptap/core";
import type { Editor as TiptapEditor } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
} from "@tiptap/suggestion";
import type { Instance as TippyInstance } from "tippy.js";
import { Button } from "@headlessui/react";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  BubbleMenu,
  EditorContent,
  Extension,
  ReactRenderer,
  useEditor,
} from "@tiptap/react";
import Typography from "@tiptap/extension-typography";
import StarterKit from "@tiptap/starter-kit";
import Suggestion from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  HiH1,
  HiH2,
  HiH3,
  HiOutlineBold,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineCodeBracket,
  HiOutlineCodeBracketSquare,
  HiOutlineItalic,
  HiOutlineListBullet,
  HiOutlineMinus,
  HiOutlineNumberedList,
  HiOutlineStrikethrough,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import tippy from "tippy.js";
import { Markdown } from "tiptap-markdown";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    slashSuggestion: {
      setSlashSuggestion: () => ReturnType;
    };
  }
}

interface SlashCommandItem {
  title: string;
  icon?: React.ReactNode;
  command?: (props: { editor: TiptapEditor; range: TiptapRange }) => void;
  disabled?: boolean;
}

interface SlashCommandsOptions {
  suggestion?: Partial<SuggestionOptions>;
  commandItems?: SlashCommandItem[];
  options?: any;
}

function filterSlashCommandItems(items: SlashCommandItem[], query: string) {
  return items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
}

interface RenderSuggestionsProps {
  editor: TiptapEditor;
  clientRect: () => DOMRect;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const CommandsList = forwardRef<
  { onKeyDown: (props: SuggestionKeyDownProps) => boolean },
  {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
  }
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: SuggestionKeyDownProps) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === "Enter") {
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="w-56 rounded-md border border-light-200 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-500 dark:bg-dark-200">
      <div className="max-h-[350px] overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => command(item)}
            className={twMerge(
              "group flex w-full items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-300",
              index === selectedIndex && "bg-light-200 dark:bg-dark-300",
            )}
          >
            <span className="text-dark-700 dark:text-dark-800">
              {item.icon}
            </span>
            <span className="ml-3 text-[12px] font-medium text-dark-900 dark:text-dark-1000">
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandsList.displayName = "CommandsList";

const RenderSuggestions = () => {
  let reactRenderer: ReactRenderer;
  let popup: TippyInstance[];

  return {
    onStart: (props: RenderSuggestionsProps) => {
      reactRenderer = new ReactRenderer(CommandsList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) return;

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: reactRenderer.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },
    onUpdate(props: RenderSuggestionsProps) {
      reactRenderer.updateProps(props);

      if (!props.clientRect) return;

      popup[0]?.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },
    onKeyDown(props: SuggestionKeyDownProps): boolean {
      if (props.event.key === "Escape") {
        popup[0]?.hide();
        return true;
      }

      return (
        (
          reactRenderer.ref as {
            onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
          }
        ).onKeyDown?.(props) ?? false
      );
    },
    onExit() {
      popup[0]?.destroy();
      reactRenderer.destroy();
    },
  };
};

const commandItems: SlashCommandItem[] = [
  {
    title: "Heading 1",
    icon: <HiH1 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: <HiH2 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: <HiH3 />,
    command: ({ editor }) =>
      editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    icon: <HiOutlineListBullet />,
    command: ({ editor }) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Ordered List",
    icon: <HiOutlineNumberedList />,
    command: ({ editor }) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Blockquote",
    icon: <HiOutlineChatBubbleLeftEllipsis />,
    command: ({ editor }) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    icon: <HiOutlineCodeBracketSquare />,
    command: ({ editor }) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Horizontal Rule",
    icon: <HiOutlineMinus />,
    command: ({ editor }) => editor.chain().focus().setHorizontalRule().run(),
  },
];

const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: "slash-commands",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return filterSlashCommandItems(
            this.parent().commandItems ?? [],
            query,
          );
        },
        render: () => {
          let component: ReturnType<typeof RenderSuggestions>;
          return {
            onStart: (props: any) => {
              component = RenderSuggestions();
              component.onStart(props);
            },
            onUpdate(props: any) {
              component.onUpdate(props);
            },
            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                return true;
              }
              return component.onKeyDown(props) ?? false;
            },
            onExit: () => {
              component.onExit();
            },
          };
        },
      },
      commandItems: [] as SlashCommandItem[],
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        render: RenderSuggestions,
      } as SuggestionOptions),
    ];
  },
});

export default function DocEditor() {
  const [title, setTitle] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Link.configure({
          openOnClick: true,
          HTMLAttributes: {
            class:
              "text-blue-600 hover:text-blue-800 underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300",
            target: "_blank",
            rel: "noopener noreferrer",
          },
          validate: (href) => /^https?:\/\//.test(href),
          autolink: true,
          linkOnPaste: true,
        }),
        Markdown,
        Placeholder.configure({
          placeholder:
            "Start writing, or type '/' for commands...",
        }),
        SlashCommands.configure({
          commandItems,
          suggestion: {
            items: ({ query }: { query: string }) =>
              filterSlashCommandItems(commandItems, query),
            startOfLine: true,
            char: "/",
          },
        }),
        Typography.configure({
          openDoubleQuote: false,
          closeDoubleQuote: false,
          openSingleQuote: false,
          closeSingleQuote: false,
          oneHalf: false,
          oneQuarter: false,
          threeQuarters: false,
          superscriptTwo: false,
          superscriptThree: false,
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class: "outline-none focus:outline-none focus-visible:ring-0",
        },
      },
      editable: true,
      injectCSS: false,
    },
    [],
  );

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  const handleTitleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    const target = e.target;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  };

  return (
    <div ref={containerRef} className="min-h-full bg-light-50 dark:bg-dark-50">
      <style jsx global>{`
        .doc-editor .tiptap p.is-empty::before {
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          color: inherit;
          opacity: 0.4;
        }
        .doc-editor .tiptap p {
          margin: 0 0 0.75rem 0 !important;
        }
        .doc-editor .tiptap h1 {
          font-size: 1.875rem !important;
          font-weight: 700 !important;
          margin: 2rem 0 1rem 0 !important;
          line-height: 1.3 !important;
        }
        .doc-editor .tiptap h2 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          margin: 1.75rem 0 0.75rem 0 !important;
          line-height: 1.35 !important;
        }
        .doc-editor .tiptap h3 {
          font-size: 1.25rem !important;
          font-weight: 600 !important;
          margin: 1.5rem 0 0.5rem 0 !important;
          line-height: 1.4 !important;
        }
        .doc-editor .tiptap ul {
          list-style-type: disc !important;
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        .doc-editor .tiptap ol {
          list-style-type: decimal !important;
          padding-left: 1.5rem !important;
          margin: 0.75rem 0 !important;
        }
        .doc-editor .tiptap li {
          margin: 0.25rem 0 !important;
        }
        .doc-editor .tiptap li p {
          margin: 0 !important;
        }
        .doc-editor .tiptap blockquote {
          border-left: 3px solid #d1d5db !important;
          padding-left: 1rem !important;
          margin: 1rem 0 !important;
          font-style: italic !important;
          color: #6b7280 !important;
        }
        .doc-editor .tiptap pre {
          background-color: #1f2937 !important;
          color: #f9fafb !important;
          border-radius: 0.5rem !important;
          padding: 1rem !important;
          margin: 1rem 0 !important;
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
          font-size: 0.875rem !important;
          overflow-x: auto !important;
        }
        .doc-editor .tiptap pre code {
          background: none !important;
          padding: 0 !important;
          color: inherit !important;
          font-size: inherit !important;
        }
        .doc-editor .tiptap code {
          background-color: #f3f4f6 !important;
          color: #dc2626 !important;
          border-radius: 0.25rem !important;
          padding: 0.125rem 0.375rem !important;
          font-size: 0.875em !important;
          font-family: 'JetBrains Mono', 'Fira Code', monospace !important;
        }
        .doc-editor .tiptap hr {
          border: none !important;
          border-top: 2px solid #e5e7eb !important;
          margin: 2rem 0 !important;
        }
        .doc-editor .tiptap p,
        .doc-editor .tiptap li {
          font-size: 1.0625rem !important;
          line-height: 1.75 !important;
        }
        .dark .doc-editor .tiptap blockquote {
          border-left-color: #4b5563 !important;
          color: #9ca3af !important;
        }
        .dark .doc-editor .tiptap code {
          background-color: #374151 !important;
          color: #f87171 !important;
        }
        .dark .doc-editor .tiptap hr {
          border-top-color: #374151 !important;
        }
      `}</style>
      <div className="mx-auto max-w-4xl px-8 py-16 sm:px-12 lg:px-16">
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitleInput}
          placeholder="Untitled"
          rows={1}
          className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[2.5rem] font-bold leading-tight text-neutral-900 placeholder:text-light-800 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-800"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus("start");
            }
          }}
        />
        <div className="my-4 h-[1px] bg-light-200 dark:bg-dark-200" />
        <div className="doc-editor">
          {editor && <DocEditorBubbleMenu editor={editor} />}
          <EditorContent
            editor={editor}
            className="min-h-[60vh] text-neutral-800 dark:text-dark-1000"
          />
        </div>
      </div>
    </div>
  );
}

function DocEditorBubbleMenu({ editor }: { editor: TiptapEditor }) {
  const isMac =
    typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  const bubbleMenuItems = [
    {
      title: "Bold",
      icon: <HiOutlineBold />,
      keys: ["meta", "b"],
      onClick: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      title: "Italic",
      icon: <HiOutlineItalic />,
      keys: ["meta", "i"],
      onClick: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    {
      title: "Strikethrough",
      icon: <HiOutlineStrikethrough />,
      keys: ["meta", "shift", "s"],
      onClick: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
    },
    {
      title: "Code",
      icon: <HiOutlineCodeBracket />,
      keys: ["meta", "e"],
      onClick: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive("code"),
    },
  ];

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 150,
        animation: "shift-toward-subtle",
      }}
    >
      <div className="flex items-center gap-1 rounded-lg border border-light-200 bg-light-50 px-1 py-0.5 shadow-lg dark:border-dark-400 dark:bg-dark-100">
        {bubbleMenuItems.map((item) => (
          <Button
            key={item.title}
            className={twMerge(
              "rounded-md p-1.5 text-light-900 transition-colors hover:bg-light-200 focus:ring-0 dark:text-dark-900 dark:hover:bg-dark-300",
              item.active &&
                "bg-light-200 text-neutral-900 dark:bg-dark-300 dark:text-dark-1000",
            )}
            title={`${item.title} [${item.keys.join(" + ").replace("meta", isMac ? "⌘" : "ctrl")}]`}
            onClick={item.onClick}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                item.onClick();
              }
            }}
          >
            {item.icon}
          </Button>
        ))}
      </div>
    </BubbleMenu>
  );
}
