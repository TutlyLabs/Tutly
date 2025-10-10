"use client"

import React, { useRef } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import ImageResizer from './ImageResizer'

export default (props: any) => {
  const imageRef = useRef<HTMLImageElement>(null);

  const handleResizeEnd = (width: number, height: number) => {
    props.updateAttributes({
      width: width,
      height: height
    });
  };

  const isReadonly = props.editor?.isEditable === false;

  return (
    <NodeViewWrapper className={`image-resizer-wrapper ${isReadonly ? 'readonly' : ''}`}>
      {props.extension.options.useFigure ? (
        <figure>
          <img {...props.node.attrs} className='postimage' ref={imageRef} />
        </figure>
      ) : (
        <img {...props.node.attrs} className='postimage' ref={imageRef} />
      )}
      {!isReadonly && (
        <ImageResizer
          editor={props.editor}
          imageRef={imageRef}
          minWidth={50}
          maxWidth={800}
          minHeight={50}
          maxHeight={600}
          keepRatio={true}
          onResizeEnd={handleResizeEnd}
        />
      )}
    </NodeViewWrapper>
  )
}