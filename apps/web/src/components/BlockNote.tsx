import "@blocknote/mantine/style.css";

import { BlockNoteView } from "@blocknote/mantine";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  TextAlignButton,
} from "@blocknote/react";
import type { BlockNoteEditor } from "@blocknote/core";
import React from "react";

import { themeEditor } from "@kan/shared";

interface BlockNoteProps {
  editor: BlockNoteEditor;
  resolvedTheme: string | undefined;
  onChange: () => void;
}

export default function BlockNote({
  editor,
  resolvedTheme,
  onChange: handleEditorChange,
}: BlockNoteProps) {
  const Toolbar = () => (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <BlockTypeSelect key={"blockTypeSelect"} />

          <FileCaptionButton key={"fileCaptionButton"} />
          <FileReplaceButton key={"replaceFileButton"} />

          <BasicTextStyleButton
            basicTextStyle={"bold"}
            key={"boldStyleButton"}
          />
          <BasicTextStyleButton
            basicTextStyle={"italic"}
            key={"italicStyleButton"}
          />
          <BasicTextStyleButton
            basicTextStyle={"underline"}
            key={"underlineStyleButton"}
          />
          <BasicTextStyleButton
            basicTextStyle={"strike"}
            key={"strikeStyleButton"}
          />
          <BasicTextStyleButton
            key={"codeStyleButton"}
            basicTextStyle={"code"}
          />

          <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
          <TextAlignButton
            textAlignment={"center"}
            key={"textAlignCenterButton"}
          />
          <TextAlignButton
            textAlignment={"right"}
            key={"textAlignRightButton"}
          />

          <ColorStyleButton key={"colorStyleButton"} />

          <CreateLinkButton key={"createLinkButton"} />
        </FormattingToolbar>
      )}
    />
  );

  return (
    <div className="mt-10">
      <div className="[&_.bn-container]:!max-w-none [&_.bn-editor]:!px-0 [&_.bn-editor]:!py-0">
        <BlockNoteView
          editor={editor}
          theme={
            resolvedTheme === "dark" ? themeEditor.dark : themeEditor.light
          }
          onChange={handleEditorChange}
          sideMenu={false}
          formattingToolbar={false}
        >
          <Toolbar />
        </BlockNoteView>
      </div>
    </div>
  );
}
