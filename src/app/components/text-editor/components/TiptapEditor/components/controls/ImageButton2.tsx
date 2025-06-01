import MenuButton from "../MenuButton";
import {useEditorState} from "@tiptap/react";
import {useTiptapContext} from "../Provider";
import Dialog from "../ui/Dialog";
import MediaLibrary from "../../../MediaLibrary";
import useModal from "../../hooks/useModal";

const ImageButton = () => {
  const {editor} = useTiptapContext();
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        active: ctx.editor.isActive("image"),
        disabled: !ctx.editor.isEditable,
      };
    },
  });

  const {open, handleOpen, handleClose} = useModal();

  return (
    <>
      <MenuButton 
        icon="Image" 
        tooltip="Insert image (opens media gallery)" 
        {...state} 
        onClick={handleOpen}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <MediaLibrary onClose={handleClose} onInsert={(image)=>{
          editor
            .chain()
            .focus()
            .insertImage({
              src: image.url,
              width: image.width,
              height: image.height,
            })
            .run();
          handleClose();
        }}/>
      </Dialog>
    </>
  );
};

export default ImageButton;
