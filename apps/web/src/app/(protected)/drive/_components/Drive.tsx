"use client";

import type { File } from "@tutly/db/browser";
import { formatDistanceToNow } from "date-fns";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@tutly/ui/button";
import { Card } from "@tutly/ui/card";
import { Input } from "@tutly/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import { useFileUpload } from "@/components/useFileUpload";
import { openExternalUrl } from "@/lib/native-files";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

const Drive = ({ uploadedFiles }: { uploadedFiles: File[] }) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const router = useRouter();

  const { uploadFile } = useFileUpload({
    fileType: "OTHER",
    onUpload: async (file) => {
      if (!file?.publicUrl) return;
      toast.success("File uploaded successfully");
    },
  });

  const { mutateAsync: archiveFile } = api.fileupload.archiveFile.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      setDeleteReason("");
    },
    onError: () => {
      toast.error("Failed to delete file");
    },
  });

  const { mutate: downloadFile } = api.fileupload.getDownloadUrl.useMutation({
    onSuccess: (data) => {
      const url = typeof data === "string" ? data : data?.signedUrl;
      if (url) void openExternalUrl(url);
    },
    onError: () => {
      toast.error("Failed to download file");
    },
  });

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);

    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadFile(file);
      toast.success("File uploaded successfully");
    } catch (err) {
      toast.error("Upload failed");
      console.error("Upload error:", err);
    }
    router.refresh();
    setIsUploading(false);
  };

  const handleDownload = (fileId: string) => {
    downloadFile({ fileId });
  };

  const handleArchive = async (fileId: string) => {
    await archiveFile({
      fileId,
      reason: deleteReason,
    });
    router.refresh();
  };

  const fileTypes = ["ALL", "OTHER", "NOTES", "ATTACHMENT", "AVATAR"] as const;

  const DeleteDialog = ({ fileId }: { fileId: string }) => (
    <Button
      variant="ghost"
      size="icon"
      title="Delete"
      onClick={async () => {
        const reason = window.prompt("Please enter a reason for deletion:");
        if (reason !== null) {
          setDeleteReason(reason);
          await handleArchive(fileId);
        }
      }}
    >
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  );

  const FileCard = ({ file }: { file: File }) => (
    <Card
      key={file.id}
      className="bg-card flex items-start gap-3 rounded-xl border p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-4"
    >
      <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <FileText className="text-primary h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-foreground truncate text-sm font-medium sm:text-base">
          {file.name}
        </h3>
        <p className="text-muted-foreground text-[11px]">
          {formatDistanceToNow(new Date(file.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => void handleDownload(file.id)}
          aria-label="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        <DeleteDialog fileId={file.id} />
      </div>
    </Card>
  );

  const EmptyState = ({ fileType }: { fileType?: string }) => (
    <div className="bg-card flex flex-col items-center rounded-xl border py-12 px-6 text-center shadow-sm">
      <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <FileText className="text-muted-foreground/70 h-5 w-5" />
      </div>
      <h3 className="text-foreground text-base font-semibold">
        No {fileType ? `${fileType.toLowerCase()} ` : ""}files yet
      </h3>
      <p className="text-muted-foreground text-sm">
        Your uploaded {fileType ? `${fileType.toLowerCase()} ` : ""}files will
        appear here.
      </p>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            My Drive
          </h1>
          <p className="text-muted-foreground text-sm">
            Upload, browse, and manage your files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="cursor-pointer gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {isUploading && (
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
        </div>
      )}

      <Tabs defaultValue="ALL" className="space-y-3">
        <div className="-mx-3 overflow-x-auto pb-2 sm:mx-0">
          <TabsList className="bg-muted/40 mx-3 inline-flex h-9 w-max items-center gap-1 rounded-lg p-1 sm:mx-0">
            {fileTypes.map((type) => (
              <TabsTrigger
                key={type}
                value={type}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 rounded-md px-3 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm"
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {fileTypes.map((fileType) => {
          const filteredFiles =
            fileType === "ALL"
              ? uploadedFiles
              : uploadedFiles.filter((file) => file.fileType === fileType);

          return (
            <TabsContent key={fileType} value={fileType} className="m-0">
              {filteredFiles.length === 0 ? (
                <EmptyState fileType={fileType !== "ALL" ? fileType : ""} />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredFiles.map((file) => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default Drive;
