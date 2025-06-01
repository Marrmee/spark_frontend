import {
  createContext,
  HTMLAttributes,
  ReactNode,
  RefObject,
  useContext,
  useRef,
  useState,
} from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import useTiptapEditor, { type UseTiptapEditorOptions } from "../hooks/useTiptapEditor";
import clsx from "clsx";
import SourceEditor from "../../SourceEditor/Editor";

type TiptapContextType = {
  editor: Editor;
  contentElement: RefObject<Element>;
  isFullScreen: boolean;
  isResizing: boolean;
  isSourceMode: boolean;
  toggleFullScreen: () => void;
  toggleSourceMode: () => void;
  setIsResizing: (value: boolean) => void;
};

const TiptapContext = createContext<TiptapContextType>({} as TiptapContextType);
export const useTiptapContext = () => useContext(TiptapContext);

type TiptapProviderProps = {
  slotBefore?: ReactNode;
  slotAfter?: ReactNode;
  editorOptions: UseTiptapEditorOptions;
  editorProps?: HTMLAttributes<HTMLDivElement>;
  children?: ReactNode;
};

export const TiptapProvider = ({
  children,
  editorOptions,
  slotBefore,
  slotAfter,
}: TiptapProviderProps) => {
  const contentElement = useRef<HTMLDivElement>(null);
  const editor = useTiptapEditor(editorOptions);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  if (!editor) {
    return null;
  }

  const focusEditorViaContainer = (event: React.MouseEvent) => {
    if (window.getSelection()?.toString()) {
      return;
    }
    
    const target = event.target as Element;
    const content = contentElement.current;
    if (content && target.contains(content)) {
      editor.commands.focus();
    }
  };

  const editorContent = (
    <div className={clsx("rte-editor", isFullScreen && "rte-editor--fullscreen")}>
      {slotBefore}
      <div 
        className="rte-editor__container" 
        onMouseDown={focusEditorViaContainer}
        style={{ userSelect: 'text' }}
      >
        {isSourceMode ? (
          <SourceEditor initialContent={editor.getHTML() || ""} />
        ) : (
          <EditorContent 
            ref={contentElement} 
            editor={editor} 
            className="rte-editor__content" 
            style={{ userSelect: 'text' }}
          />
        )}
      </div>
      {children}
      {slotAfter}
    </div>
  );

  return (
    <TiptapContext.Provider
      value={{
        editor,
        contentElement,
        isFullScreen,
        isResizing,
        isSourceMode,
        setIsResizing,
        toggleFullScreen: () => setIsFullScreen((prev) => !prev),
        toggleSourceMode: () => setIsSourceMode((prev) => !prev),
      }}
    >
      {editorContent}
    </TiptapContext.Provider>
  );
};

export default TiptapProvider;
