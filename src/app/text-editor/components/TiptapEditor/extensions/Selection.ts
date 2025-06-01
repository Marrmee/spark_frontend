import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const Selection = Extension.create({
  name: "selection",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("selection"),
        props: {
          decorations(state) {
            if (state.selection.empty) {
              return null;
            }

            // Create decorations for the current selection
            const decorations = [
              Decoration.inline(state.selection.from, state.selection.to, {
                class: "selection",
              }),
            ];

            // Add improved handling for heading elements that may span multiple lines
            const { $from, $to } = state.selection;
            const isMultiLineHeading = 
              ($from.parent.type.name === 'heading' || $to.parent.type.name === 'heading') && 
              ($from.start() !== $to.start() || $from.end() !== $to.end() || $from.pos !== $to.pos);

            if (isMultiLineHeading) {
              // Add an additional decoration for multi-line headings to improve selection visibility
              decorations.push(
                Decoration.inline($from.start(), $to.end(), {
                  class: "multi-line-heading-selection",
                })
              );
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export default Selection;
