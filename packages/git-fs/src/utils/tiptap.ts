import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';

export const generateAssignmentHtml = (json: any): string => {
  if (!json) return '';

  try {
    return generateHTML(json, [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
    ]);
  } catch (error) {
    console.error('Error generating HTML from Tiptap JSON:', error);
    return '';
  }
};
