import dynamic from "next/dynamic";

const DocEditorInner = dynamic(() => import("./DocEditorInner"), {
  ssr: false,
});

export default function DocEditor() {
  return <DocEditorInner />;
}
