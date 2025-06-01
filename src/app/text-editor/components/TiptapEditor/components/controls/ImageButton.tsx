import MenuButton from "../MenuButton";
import { useEditorState } from "@tiptap/react";
import { useTiptapContext } from "../Provider";
import UploadWidget from "../../../../components/Cloudinary/upload-widget";
import { useEffect, useState } from "react";

const ImageButton = () => {
  const { editor } = useTiptapContext();
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        active: ctx.editor.isActive("image"),
        disabled: !ctx.editor.isEditable,
      };
    },
  });

  // Check if API is available on component mount
  useEffect(() => {
    const checkApiAvailability = async () => {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) {
          console.warn('Images API is not available:', response.status);
          setIsApiAvailable(false);
        }
      } catch (error) {
        console.warn('Images API fetch error:', error);
        setIsApiAvailable(false);
      }
    };
    
    checkApiAvailability();
  }, []);

  //  const fileInput = useRef<HTMLInputElement>(null);
  //  const handleClick = useCallback(() => {
  //    fileInput.current?.click();
  //  }, []);

  //  const onUpload = useCallback(
  //    (e: ChangeEvent<HTMLInputElement>) => {
  //      const target = e.target;
  //      const file = target.files?.[0];
  //      if (file?.type.startsWith("image/")) {
  //        const url = URL.createObjectURL(file);
  //        editor.chain().setImage({ src: url }).focus().run();
  //      }
  //    },
  //    [editor]
  //  );

  return (
    //  <MediaLibrary
    //    onInsert={({ assets }: any) => {
    //      if (!Array.isArray(assets)) return;
    //      const image = assets[0];
    //      console.log(image);
    //      editor
    //        .chain()
    //        .focus()
    //        .insertImage({
    //          src: image.url,
    //          width: image.width,
    //          height: image.height,
    //          // originalWidth: image.width,
    //          // originalHeight: image.height,
    //        })
    //        .run();
    //      //   editor.chain().focus().setImageBlock({ src: image.url, caption: "" }).run();
    //    }}
    //  >
    //    {({ open }) => {
    //      return <MenuButton icon="Image" tooltip="Image" {...state} onClick={open} />;
    //    }}
    //  </MediaLibrary>

    <UploadWidget
      onSuccess={(result, widget) => {
        const image = result.info!;
        editor
          .chain()
          .focus()
          .insertImage({
            src: image.url,
            width: image.width,
            height: image.height,
            // originalWidth: image.width,
            // originalHeight: image.height,
          })
          .run();
        widget.close();
      }}
      onError={(error) => {
        console.error("Image upload error:", error);
        // You could add a notification here if you have a notification system
      }}
    >
      {({ open }) => {
        return <MenuButton 
          icon="Image" 
          tooltip={isApiAvailable ? "Upload Image" : "Upload Image (using Cloudinary)"}
          {...state} 
          onClick={() => {
            // Apply a dark overlay to the entire page when the upload widget opens
            const darkOverlay = document.createElement('div');
            darkOverlay.id = 'cloudinary-dark-overlay';
            darkOverlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(0, 0, 0, 0.75);
              z-index: 9999;
              pointer-events: none;
            `;
            document.body.appendChild(darkOverlay);
            
            // Remove the overlay when the widget is closed (cleanup happens in setTimeout)
            setTimeout(() => {
              const existingOverlay = document.getElementById('cloudinary-dark-overlay');
              if (existingOverlay) {
                existingOverlay.remove();
              }
            }, 100);
            
            // Open the widget
            open();
          }} 
        />;
      }}
    </UploadWidget>

    //  <Fragment>
    //    <MenuButton icon="Image" tooltip="Image" {...state} onClick={handleClick} />
    //    <input
    //      style={{ display: "none" }}
    //      type="file"
    //      accept="image/*"
    //      ref={fileInput}
    //      onChange={onUpload}
    //    />
    //  </Fragment>
  );
};

export default ImageButton;
