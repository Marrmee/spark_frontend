import React, { memo } from "react";
import clsx from "clsx";

import { Toolbar, ToolbarDivider } from "./ui/Toolbar";

import BoldButton from "./controls/BoldButton";
import ItalicButton from "./controls/ItalicButton";
import UndoButton from "./controls/UndoButton";
import RedoButton from "./controls/RedoButton";
import UnderlineButton from "./controls/UnderlineButton";
import AlignPopover from "./controls/AlignPopover";
import HeadingDropdown from "./controls/HeadingDropdown";
import BulletListButton from "./controls/BulletListButton";
import OrderedListButton from "./controls/OrderedList";
import HorizontalRuleButton from "./controls/HorizontalRuleButton";
import MoreMarkDropdown from "./controls/MoreMarkPopover";
// import ImageButton from "./controls/ImageButton2";
import TextColorButton from "./controls/TextColorButton";
import TextHighlightButton from "./controls/TextHighlightButton";
import InsertDropdown from "./controls/InsertDropdown";
import TableButton from "./controls/TableButton";

interface MenuBarProps {
  className?: string;
}

const MenuBar = ({ className }: MenuBarProps = {}) => {
  return (
    <div className={clsx("rte-menu-bar", className)}>
      <Toolbar dense>
        <UndoButton />
        <RedoButton />
        {/* <ClearFormatButton /> */}

        <ToolbarDivider />

        <HeadingDropdown />

        <ToolbarDivider />

        <BoldButton />
        <ItalicButton />
        <UnderlineButton />
        <MoreMarkDropdown />

        <ToolbarDivider />

        <TextColorButton />
        <TextHighlightButton />

        <ToolbarDivider />

        <AlignPopover />
        <BulletListButton />
        <OrderedListButton />
        <HorizontalRuleButton />

        <ToolbarDivider />

        {/* <BlockquoteButton /> */}
        {/* LinkButton removed for security */}
        <TableButton />
        {/* <ImageButton /> */}
        {/* <YoutubeButton /> */}
        {/* <CodeBlockButton /> */}
        <InsertDropdown />
      </Toolbar>
    </div>
  );
};

export default memo(MenuBar);
