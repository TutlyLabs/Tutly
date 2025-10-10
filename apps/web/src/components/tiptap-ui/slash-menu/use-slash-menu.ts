"use client";

import * as React from "react";
import { Editor } from "@tiptap/react";

interface SlashMenuState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  commandStartPos: number;
}

export function useSlashMenu(editor: Editor | null) {
  const [state, setState] = React.useState<SlashMenuState>({
    isOpen: false,
    query: "",
    position: { top: 0, left: 0 },
    commandStartPos: 0,
  });

  const closeMenu = React.useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, query: "" }));
  }, []);

  const openMenu = React.useCallback(
    (
      position: { top: number; left: number },
      query: string = "",
      commandStartPos: number = 0,
    ) => {
      setState({
        isOpen: true,
        query,
        position,
        commandStartPos,
      });
    },
    [],
  );

  // Handle slash command detection
  React.useEffect(() => {
    if (!editor) return;

    const handleUpdate = ({ editor }: { editor: Editor }) => {
      const { selection } = editor.state;
      const { $from } = selection;

      // Get the text before the cursor
      const textBeforeCursor = editor.state.doc.textBetween(
        Math.max(0, $from.pos - 50),
        $from.pos,
        "\n",
      );

      // Look for slash command pattern
      const slashMatch = textBeforeCursor.match(/\/([a-zA-Z]*)$/);

      if (slashMatch) {
        const query = slashMatch[1];
        const commandStartPos = $from.pos - slashMatch[0].length; // Position where / starts

        // Get cursor position for menu placement
        const coords = editor.view.coordsAtPos($from.pos);
        const editorRect = editor.view.dom.getBoundingClientRect();

        const position = {
          top: coords.bottom - editorRect.top + 5,
          left: coords.left - editorRect.left,
        };

        openMenu(position, query, commandStartPos);
      } else if (state.isOpen) {
        // Close menu if slash command is not active
        closeMenu();
      }
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, state.isOpen, openMenu, closeMenu]);

  const replaceCommand = React.useCallback(
    (editor: Editor, commandText: string) => {
      if (!state.isOpen) return;

      const commandLength = 1 + state.query.length; // / + query length
      const from = state.commandStartPos;
      const to = state.commandStartPos + commandLength;

      // Replace the slash command with the actual content
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(commandText)
        .run();

      closeMenu();
    },
    [state.isOpen, state.query, state.commandStartPos, closeMenu],
  );

  return {
    ...state,
    closeMenu,
    openMenu,
    replaceCommand,
  };
}
