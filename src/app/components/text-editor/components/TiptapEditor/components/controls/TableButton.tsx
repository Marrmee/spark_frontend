import React from "react";
import MenuButton from "../MenuButton";
import {useEditorState} from "@tiptap/react";
import {useTiptapContext} from "../Provider";
import TableBuilder from "../TableBuilder";

const TableButton = () => {
  const {editor} = useTiptapContext();
  const state = useEditorState({
    editor,
    // eslint-disable-next-line
    selector: (ctx: any) => {
      return {
        // disabled: !ctx.editor.can().insertTable(),
      };
    },
  });

  return (
    <MenuButton
      icon="Table"
      tooltip="Table"
      type="popover"
      hideArrow
      {...state}
    >
      <TableBuilder
        onCreate={({rows, cols}) => editor.chain().insertTable({rows, cols, withHeaderRow: false}).focus().run()}
      />
    </MenuButton>
  );
};

export default TableButton;
