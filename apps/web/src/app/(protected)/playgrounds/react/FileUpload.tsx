"use client";

import React, { useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";

interface FileData {
  path: string;
  content: string;
}

const imagExtensions = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "tiff",
];

const FolderUpload = ({
  setFilesObj,
}: {
  setFilesObj: (filesObj: Record<string, string>) => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const items = e.target.files;
    if (items) {
      setIsLoading(true);
      await processFiles(items);
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    if (items) {
      setIsLoading(true);
      await processDataTransferItems(items);
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processDataTransferItems = async (items: DataTransferItemList) => {
    const fileArray: FileData[] = [];
    const filesObj: Record<string, string> = {};
    for (const item of Array.from(items)) {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        await traverseFileTree(entry, "", fileArray);
      }
    }

    for (const file of fileArray) {
      filesObj[file.path] = file.content;
    }

    const filesObjWithoutFolderName: Record<string, string> = {};

    for (const key in filesObj) {
      const newKey = key.split("/").slice(1).join("/");
      filesObjWithoutFolderName[newKey] = filesObj[key]!;
    }

    setFilesObj(filesObjWithoutFolderName);
  };

  const processFiles = async (files: FileList) => {
    const fileArray: FileData[] = [];
    const filesObj: Record<string, string> = {};
    for (const file of Array.from(files)) {
      const filePath = file.webkitRelativePath || file.name;

      // Skip node_modules folder, .git folder, .DS_Store. //todo: add more
      if (
        filePath.includes("node_modules") ||
        filePath.includes(".git/") ||
        filePath.includes(".DS_Store")
      ) {
        continue;
      }

      // Skip image files
      if (imagExtensions.some((ext) => filePath.endsWith(ext))) {
        continue;
      }

      const content = await readFileContent(file);
      fileArray.push({ path: filePath, content });
      filesObj[filePath] = content;
    }

    const filesObjWithoutFolderName: Record<string, string> = {};

    for (const key in filesObj) {
      const newKey = key.split("/").slice(1).join("/");
      filesObjWithoutFolderName[newKey] = filesObj[key]!;
    }

    setFilesObj(filesObjWithoutFolderName);
  };

  const traverseFileTree = async (
    item: any,
    path: string,
    fileArray: FileData[],
  ) => {
    if (item.isFile) {
      const file = await new Promise<File>((resolve) => item.file(resolve));
      // Skip node_modules folder, .git folder, .DS_Store. //todo: add more
      if (
        path.includes("node_modules") ||
        path.includes(".git/") ||
        path.includes(".DS_Store") ||
        file.name.includes(".DS_Store")
      ) {
        return;
      }

      // Skip image files
      if (imagExtensions.some((ext) => file.name.endsWith(ext))) {
        return;
      }

      const content = await readFileContent(file);
      fileArray.push({ path: path + file.name, content });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const entries = await new Promise<any[]>((resolve) =>
        dirReader.readEntries(resolve),
      );
      for (const entry of entries) {
        await traverseFileTree(entry, path + item.name + "/", fileArray);
      }
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  return (
    <div className="p-10">
      <div className="flex flex-col items-center">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`group flex w-full cursor-pointer flex-col items-center justify-center gap-6 rounded-lg border-2 border-dotted p-10 transition-all duration-300 ease-in-out md:w-2/5 ${
            isDragging
              ? "border-indigo-500 bg-indigo-100"
              : "border-gray-600 bg-white"
          }`}
        >
          <IoCloudUploadOutline className="h-20 w-20 text-blue-500 transition-transform duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-700" />

          <label
            htmlFor="fileInput"
            className="cursor-pointer text-lg font-semibold text-gray-500 transition-colors duration-300 ease-in-out group-hover:text-blue-600"
          >
            {isDragging
              ? "Drop React folder here"
              : "Drag and drop react folder here"}
            <input
              id="fileInput"
              type="file"
              {...({ webkitdirectory: true } as any)}
              webkitdirectory="true"
              className="hidden"
              onChange={handleFileSelect}
              ref={inputRef}
            />
          </label>
        </div>
      </div>

      {isLoading && (
        <div className="bg-opacity/50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"></div>
            <p className="mt-4 font-semibold text-blue-600">Loading files...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderUpload;
