import type { ListItemNode } from "@lexical/list";
import {
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  insertList,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $findMatchingParent,
  calculateZoomLevel,
  isHTMLElement,
  mergeRegister,
} from "@lexical/utils";
import type { LexicalEditor } from "lexical";
import {
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  getNearestEditorFromDOMNode,
} from "lexical";
import { useEffect } from "react";
import type { ElementNode } from "lexical";

export function CheckListPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        INSERT_CHECK_LIST_COMMAND,
        () => {
          insertList(editor, "check");
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_DOWN_COMMAND,
        (event) => {
          return handleArrownUpOrDown(event, editor, false);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_UP_COMMAND,
        (event) => {
          return handleArrownUpOrDown(event, editor, true);
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ESCAPE_COMMAND,
        () => {
          const activeItem = getActiveCheckListItem();

          if (activeItem != null) {
            const rootElement = editor.getRootElement();

            if (rootElement != null) {
              rootElement.focus();
            }

            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_SPACE_COMMAND,
        (event) => {
          const activeItem = getActiveCheckListItem();

          if (activeItem != null && editor.isEditable()) {
            editor.update(() => {
              const listItemNode = $getNearestNodeFromDOMNode(activeItem);

              if ($isListItemNode(listItemNode)) {
                event.preventDefault();
                listItemNode.toggleChecked();
              }
            });
            return true;
          }

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand<KeyboardEvent>(
        KEY_ARROW_LEFT_COMMAND,
        (event) => {
          return editor.getEditorState().read(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection) && selection.isCollapsed()) {
              const { anchor } = selection;
              const isElement = anchor.type === "element";

              if (isElement || anchor.offset === 0) {
                const anchorNode = anchor.getNode();
                const elementNode = $findMatchingParent(
                  anchorNode,
                  (node) => $isElementNode(node) && !node.isInline(),
                );
                if ($isListItemNode(elementNode)) {
                  const parent = elementNode.getParent();
                  if (
                    $isListNode(parent) &&
                    parent.getListType() === "check" &&
                    (isElement ||
                      elementNode.getFirstDescendant() === anchorNode)
                  ) {
                    const domNode = editor.getElementByKey(elementNode.__key);

                    if (domNode != null && document.activeElement !== domNode) {
                      domNode.focus();
                      event.preventDefault();
                      return true;
                    }
                  }
                }
              }
            }

            return false;
          });
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerRootListener((rootElement, prevElement) => {
        if (rootElement !== null) {
          rootElement.addEventListener("click", handleClick);
          rootElement.addEventListener("pointerdown", handlePointerDown);
        }

        if (prevElement !== null) {
          prevElement.removeEventListener("click", handleClick);
          prevElement.removeEventListener("pointerdown", handlePointerDown);
        }
      }),
    );
  });

  return null;
}

function handleCheckItemEvent(event: PointerEvent, callback: () => void) {
  const target = event.target;

  if (target === null || !isHTMLElement(target)) {
    return;
  }

  // Ignore clicks on LI that have nested lists
  const firstChild = target.firstChild;

  if (
    firstChild != null &&
    isHTMLElement(firstChild) &&
    (firstChild.tagName === "UL" || firstChild.tagName === "OL")
  ) {
    return;
  }

  const parentNode = target.parentNode;

  if (
    !parentNode ||
    (parentNode as HTMLElement).dataset.lexicalListType !== "check"
  ) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const pageX = event.pageX / calculateZoomLevel(target);
  if (
    target.dir === "rtl"
      ? pageX < rect.right && pageX > rect.right - 20
      : pageX > rect.left && pageX < rect.left + 20
  ) {
    callback();
  }
}

function handleClick(event: Event) {
  handleCheckItemEvent(event as PointerEvent, () => {
    if (event.target instanceof HTMLElement) {
      const domNode = event.target;
      const editor = getNearestEditorFromDOMNode(domNode);

      if (editor?.isEditable()) {
        editor.update(() => {
          const node = $getNearestNodeFromDOMNode(domNode);

          if ($isListItemNode(node)) {
            domNode.focus();
            node.toggleChecked();
          }
        });
      }
    }
  });
}

function handlePointerDown(event: PointerEvent) {
  handleCheckItemEvent(event, () => {
    // Prevents caret moving when clicking on check mark
    event.preventDefault();
  });
}

function getActiveCheckListItem(): HTMLElement | null {
  const activeElement = document.activeElement as HTMLElement;

  return activeElement != null &&
    activeElement.tagName === "LI" &&
    activeElement.parentNode != null &&
    (activeElement.parentNode as HTMLElement).dataset.lexicalListType ===
      "check"
    ? activeElement
    : null;
}

function findCheckListItemSibling(node: ListItemNode, backward: boolean) {
  let sibling = backward ? node.getPreviousSibling() : node.getNextSibling();
  let parent = node;

  // Going up in a tree to get non-null sibling
  while (sibling == null && $isListItemNode(parent)) {
    // Get li -> parent ul/ol -> parent li
    parent = parent.getParentOrThrow().getParent() as ListItemNode;

    if (parent != null) {
      sibling = backward
        ? parent.getPreviousSibling()
        : parent.getNextSibling();
    }
  }

  // Going down in a tree to get first non-nested list item
  while ($isListItemNode(sibling)) {
    const firstChild = backward
      ? sibling.getLastChild()
      : sibling.getFirstChild();

    if (!$isListNode(firstChild)) {
      return sibling;
    }

    sibling = backward ? firstChild.getLastChild() : firstChild.getFirstChild();
  }

  return null;
}

function handleArrownUpOrDown(
  event: KeyboardEvent,
  editor: LexicalEditor,
  backward: boolean,
) {
  const activeItem = getActiveCheckListItem();

  if (activeItem != null) {
    editor.update(() => {
      const listItem = $getNearestNodeFromDOMNode(activeItem);

      if (!$isListItemNode(listItem)) {
        return;
      }

      const nextListItem = findCheckListItemSibling(listItem, backward);

      if (nextListItem != null) {
        nextListItem.selectStart();
        const dom = editor.getElementByKey(nextListItem.__key);

        if (dom) {
          event.preventDefault();
          setTimeout(() => {
            dom.focus();
          }, 0);
        }
      }
    });
  }

  return false;
}
