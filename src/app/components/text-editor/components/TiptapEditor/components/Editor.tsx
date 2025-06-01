"use client";

import React, { forwardRef, useCallback, useEffect, useRef } from "react";
import { Content, type Editor } from "@tiptap/react";

import TiptapProvider from "./Provider";
import { type UseTiptapEditorOptions } from "../hooks/useTiptapEditor";

import MenuBar from "./MenuBar";
import StatusBar from "./StatusBar";
import Resizer from "./Resizer";

import { CodeBlockMenu } from "./menus";

import ExtensionKit from "../kit";

import { cssVar } from "../utils/cssVar";
import { throttle } from "../utils/throttle";

import "../styles/index.scss";
import "../../../styles/editor-scrollable.css";
import TableMenu from "./menus/TableMenu";

export type TiptapEditorRef = {
  getInstance: () => Editor | null;
};

export interface TiptapEditorProps {
  ssr?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  initialContent?: Content;
  placeholder?: {
    paragraph?: string;
    imageCaption?: string;
  };
  output?: "html" | "json";
  hideMenuBar?: boolean;
  hideStatusBar?: boolean;
  hideBubbleMenu?: boolean;
  containerClass?: string;
  menuBarClass?: string;
  contentClass?: string;
  contentMinHeight?: string | number;
  contentMaxHeight?: string | number;
  onContentChange?: (value: Content) => void;
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  (
    {
      ssr = false,
      output = "html",
      readonly = false,
      disabled = false,
      initialContent,
      placeholder,
      hideMenuBar = false,
      hideStatusBar = false,
      hideBubbleMenu = false,
      contentMinHeight = 300,
      contentMaxHeight = 400,
      // containerClass,
      menuBarClass,
      // contentClass,
      onContentChange,
    },
    ref
  ) => {
    const isEditable = !readonly && !disabled;
    const displayBubbleMenu = isEditable && !hideBubbleMenu;

    // Create a mutable ref to store our throttled function
    const throttledFnRef = useRef<((value: Content) => void) | null>(null);
    
    // Initialize the throttled function
    useEffect(() => {
      throttledFnRef.current = throttle((value: Content) => {
        onContentChange?.(value);
      }, 1500);
      
      // Cleanup on unmount or when dependencies change
      return () => {
        throttledFnRef.current = null;
      };
    }, [onContentChange]);

    const throttledUpdate = useCallback(
      (value: Content) => {
        throttledFnRef.current?.(value);
      },
      []
    );

    const handleUpdate = useCallback(
      (editor: Editor) => {
        const content =
          output === "html" ? (editor.isEmpty ? "" : editor.getHTML()) : editor.getJSON();
        throttledUpdate(content);
      },
      [throttledUpdate, output]
    );

    const editorOptions: UseTiptapEditorOptions = {
      ref,
      placeholder,
      extensions: ExtensionKit,
      content: initialContent,
      editable: isEditable,
      immediatelyRender: !ssr,
      shouldRerenderOnTransaction: false,
      autofocus: false,
      onUpdate: ({ editor }) => handleUpdate(editor),
    };

    useEffect(() => {
      cssVar("--rte-editor-min-height", `${contentMinHeight}px`);
      cssVar("--rte-editor-max-height", `${contentMaxHeight}px`);
    }, [contentMaxHeight, contentMinHeight]);

    const menus = displayBubbleMenu && (
      <>
        {/* <TextMenu  /> */}
        {/* LinkMenu removed for security */}
        {/* <ImageMenu /> */}
        <CodeBlockMenu />
        <TableMenu />
      </>
    );

    return (
      <TiptapProvider
        editorOptions={editorOptions}
        // editorProps={editorProps}
        slotBefore={!hideMenuBar && <MenuBar className={menuBarClass} />}
        slotAfter={!hideStatusBar && <StatusBar />}
      >
        {menus}
        <Resizer />
      </TiptapProvider>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
