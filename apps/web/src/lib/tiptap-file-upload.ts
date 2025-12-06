import { FileType } from "@/lib/prisma";
import axios from "axios";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { useCallback } from "react";

import { api } from "@/trpc/react";
import { getExtension } from "@/utils/file";

const ExtImage: string[] = [
  "jpeg",
  "jpg",
  "png",
  "gif",
  "svg",
  "bmp",
  "webp",
  "jfif",
];

export const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface FileUploadOptions {
  fileType?: FileType;
  onUpload?: (file: any) => Promise<void>;
  associatingId?: string;
  allowedExtensions?: string[];
}

/**
 * Hook for handling file uploads in Tiptap editor
 * This hook provides the upload function that can be used in Tiptap extensions
 */
export const useTiptapFileUpload = (fileUploadOptions?: FileUploadOptions) => {
  const createFileMutation =
    api.fileupload.createFileAndGetUploadUrl.useMutation();
  const markFileUploadedMutation =
    api.fileupload.markFileUploaded.useMutation();

  const uploadFile = useCallback(
    async (
      file: File,
      onProgress?: (event: { progress: number }) => void,
      abortSignal?: AbortSignal,
    ): Promise<string> => {
      if (!file) {
        throw new Error("No file provided");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
        );
      }

      try {
        // File type validation
        const ext: string = getExtension(file.name) || "";
        const extWithoutDot = ext.slice(1);

        if (!ExtImage.includes(extWithoutDot.toLowerCase())) {
          throw new Error(`File type not allowed: ${extWithoutDot}`);
        }

        // Image compression for large files
        let fileToUpload = file;
        if (file.size > MAX_IMAGE_SIZE) {
          const compressionOptions = {
            maxSizeMB: 2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.8,
          };
          fileToUpload = await imageCompression(file, compressionOptions);
        }

        // Create file record and get upload URL
        const result = await createFileMutation.mutateAsync({
          name: fileToUpload.name,
          fileType: fileUploadOptions?.fileType || FileType.OTHER,
          associatingId: fileUploadOptions?.associatingId,
          isPublic: true,
          mimeType: fileToUpload.type,
        });

        if (!result) throw new Error("Failed to create file");
        const { signedUrl, file: uploadedFile } = result;

        if (!signedUrl || !uploadedFile) {
          throw new Error("Failed to get upload URL");
        }

        // Upload file to storage
        await axios.put(signedUrl, fileToUpload, {
          headers: { "Content-Type": fileToUpload.type },
          onUploadProgress: (progressEvent: {
            loaded: number;
            total?: number;
          }) => {
            if (progressEvent.total) {
              const percent = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total,
              );
              onProgress?.({ progress: percent });
            }
          },
          signal: abortSignal,
        });

        // Mark file as uploaded
        const updatedFile = await markFileUploadedMutation.mutateAsync({
          fileId: uploadedFile.id,
        });

        if (!updatedFile?.publicUrl) {
          throw new Error("Failed to get file URL");
        }

        toast.success("Image uploaded successfully");
        return updatedFile.publicUrl;
      } catch (error) {
        if (abortSignal?.aborted) {
          throw new Error("Upload cancelled");
        }

        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(errorMessage);
        throw error;
      }
    },
    [createFileMutation, markFileUploadedMutation, fileUploadOptions],
  );

  return { uploadFile };
};

export const useImageUploadNodeManager = (
  fileUploadOptions?: FileUploadOptions,
) => {
  const { uploadFile } = useTiptapFileUpload(fileUploadOptions);

  const triggerImageUpload = useCallback(
    (editor: any, files: File[]) => {
      if (!editor || !files.length) return;

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (!imageFiles.length) return;

      editor.chain().focus().setImageUploadNode().run();

      setTimeout(() => {
        const { state } = editor;

        let imageUploadNodePos = -1;
        state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "imageUpload") {
            imageUploadNodePos = pos;
            return false;
          }
          return true;
        });

        if (imageUploadNodePos !== -1) {
          const nodeEl = editor.view.nodeDOM(imageUploadNodePos);
          if (nodeEl && nodeEl instanceof HTMLElement) {
            const fileInput = nodeEl.querySelector(
              'input[type="file"]',
            ) as HTMLInputElement;
            if (fileInput) {
              const dataTransfer = new DataTransfer();
              imageFiles.forEach((file) => dataTransfer.items.add(file));
              fileInput.files = dataTransfer.files;

              const changeEvent = new Event("change", { bubbles: true });
              fileInput.dispatchEvent(changeEvent);
            }
          }
        }
      }, 100);
    },
    [uploadFile],
  );

  return { triggerImageUpload };
};
