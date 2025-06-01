import React from "react";
import MenuButton from "../MenuButton";
import { useEditorState } from "@tiptap/react";
import { useTiptapContext } from "../Provider";

const HorizontalRuleButton = () => {
  const { editor } = useTiptapContext();
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        disabled: !ctx.editor.isEditable,
        // Horizontal rules don't have an active state
        active: false,
      };
    },
  });

  return (
    <MenuButton
      icon="HorizontalRule"
      tooltip="Horizontal Rule"
      shortcuts={["Mod", "Shift", "Minus"]}
      onClick={() => editor.chain().focus().setHorizontalRule().run()}
      {...state}
    />
  );
};

export default HorizontalRuleButton; 