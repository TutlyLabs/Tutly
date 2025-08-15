import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedEditor,
  SerializedLexicalNode,
  Spread,
} from "lexical";
import { DecoratorNode, createEditor } from "lexical";
import * as React from "react";
import { Suspense } from "react";

const ImageComponent = React.lazy(() => import("./ImageComponent"));

export interface ImagePayload {
  altText: string;
  caption?: LexicalEditor;
  height?: "inherit" | number;
  key?: NodeKey;
  maxWidth?: number;
  showCaption?: boolean;
  src: string;
  width?: "inherit" | number;
  captionsEnabled?: boolean;
}

function convertImageElement(domNode: Node): { node: ImageNode } | null {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src } = domNode;
    const node = $createImageNode({ altText, src });
    return { node };
  }
  return null;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    caption: SerializedEditor;
    height: "inherit" | number;
    maxWidth: number;
    showCaption: boolean;
    src: string;
    width: "inherit" | number;
    type: "image";
    version: 1;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __altText: string;
  __width: "inherit" | number;
  __height: "inherit" | number;
  __maxWidth: number;
  __showCaption: boolean;
  __caption: LexicalEditor;
  __captionsEnabled: boolean;

  static override getType(): string {
    return "image";
  }

  static override clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__showCaption,
      node.__caption,
      node.__captionsEnabled,
      node.__key,
    );
  }

  static override importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, caption, src, showCaption } =
      serializedNode;
    const node = $createImageNode({
      altText,
      height: height ?? "inherit",
      maxWidth,
      showCaption,
      src,
      width: width ?? "inherit",
    });

    if (caption) {
      const nestedEditor = node.__caption;
      const editorState = nestedEditor.parseEditorState(caption.editorState);
      if (!editorState.isEmpty()) {
        nestedEditor.setEditorState(editorState);
      }
    }

    return node;
  }

  override exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    return { element };
  }

  static override importDOM(): DOMConversionMap {
    return {
      img: (_node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: "inherit" | number,
    height?: "inherit" | number,
    showCaption?: boolean,
    caption?: LexicalEditor,
    captionsEnabled?: boolean,
    key?: NodeKey,
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width ?? "inherit";
    this.__height = height ?? "inherit";
    this.__showCaption = showCaption ?? false;
    this.__caption = caption ?? createEditor();
    this.__captionsEnabled = captionsEnabled ?? captionsEnabled === undefined;
  }

  override exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      caption: this.__caption.toJSON(),
      height: this.__height,
      maxWidth: this.__maxWidth,
      showCaption: this.__showCaption,
      src: this.getSrc(),
      type: "image",
      version: 1,
      width: this.__width,
    };
  }

  exportMarkdown(): string {
    const altText = this.getAltText();
    const src = this.getSrc();
    const width = this.__width;
    const height = this.__height;

    const dimensions =
      typeof width === "number" && typeof height === "number"
        ? ` {${Math.round(width)}x${Math.round(height)}}`
        : "";

    const cleanSrc = src.trim();

    return `![${altText}](${cleanSrc}${dimensions})\n`;
  }

  setWidthAndHeight(
    width: "inherit" | number,
    height: "inherit" | number,
  ): void {
    const writable = this.getWritable();
    writable.__width = width;
    writable.__height = height;
  }

  setShowCaption(showCaption: boolean): void {
    const writable = this.getWritable();
    writable.__showCaption = showCaption;
  }

  override createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  override updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  override decorate(): React.ReactElement {
    return (
      <Suspense fallback={null}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          maxWidth={this.__maxWidth}
          nodeKey={this.getKey()}
          resizable={true}
        />
      </Suspense>
    );
  }

  remove(): void {
    const writable = this.getWritable();
    const dom = (this as any).getDOMElement();

    if (dom?.parentNode) {
      dom.parentNode.removeChild(dom);
    }

    super.remove();
  }

  destroy(): void {
    if (this.__caption) {
      (this.__caption as any).destroy?.();
    }
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 500,
  captionsEnabled,
  src,
  width,
  showCaption,
  caption,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(
    src,
    altText,
    maxWidth,
    width,
    height,
    showCaption,
    caption,
    captionsEnabled,
    key,
  );
}

export function $isImageNode(node: unknown): node is ImageNode {
  return node instanceof ImageNode;
}
