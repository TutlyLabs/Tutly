"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Attachment } from "@tutly/db/browser";
import type { attachmentType, submissionMode } from "@tutly/db/browser";
import { FileType } from "@tutly/db/browser";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useRouter } from "next/navigation";

import RichTextEditor from "@/components/editor/RichTextEditor";
import { Button } from "@tutly/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@tutly/ui/form";
import { Input } from "@tutly/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import { api } from "@/trpc/react";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
  link: z.string().optional(),
  attachmentType: z.string().min(1, {
    message: "Type is required",
  }),
  class: z.string().optional(),
  submissionMode: z.string().min(1, {
    message: "Submission mode is required",
  }),
  courseId: z.string().optional(),
  details: z.string().optional(),
  detailsJson: z.any().optional(),
  dueDate: z.string().optional(),
  maxSubmissions: z.string().optional(),
  setupCommand: z.string().optional(),
  devCommand: z.string().optional(),
  testCommand: z.string().optional(),
  previewPorts: z.string().optional(),
  visibleTestCommand: z.string().optional(),
  hiddenTestCommand: z.string().optional(),
});

interface NewAttachmentPageProps {
  classes?: any;
  courseId?: string;
  classId?: string;
  isEditing?: boolean;
  attachment?: Attachment;
  onCancel?: () => void;
  onComplete?: () => void;
}

const NewAttachmentPage = ({
  classes,
  courseId,
  classId,
  isEditing = false,
  attachment,
  onCancel,
  onComplete,
}: NewAttachmentPageProps) => {
  const router = useRouter();

  const updateAttachment = api.attachments.updateAttachment.useMutation();
  const createAttachment = api.attachments.createAttachment.useMutation();
  const updateWorkspaceConfig =
    api.assignments.updateWorkspaceConfig.useMutation();
  const createStarterUpload =
    api.assignments.createWorkspaceStarterUpload.useMutation();
  const confirmArtifactUpload =
    api.submissions.confirmWorkspaceArtifactUpload.useMutation();
  const updateFileAssociatingId =
    api.fileupload.updateAssociatingId.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: attachment?.title ?? "",
      link: attachment?.link ?? "",
      attachmentType: attachment?.attachmentType ?? "ASSIGNMENT",
      submissionMode: attachment?.submissionMode ?? "SANDBOX",
      class: classId ?? attachment?.classId ?? "",
      courseId: courseId ?? "",
      details: attachment?.details ?? "",
      detailsJson: attachment?.detailsJson ?? null,
      dueDate: attachment?.dueDate
        ? new Date(attachment.dueDate).toISOString().split("T")[0]
        : "",
      maxSubmissions: attachment?.maxSubmissions?.toString() ?? "1",
      setupCommand: "pnpm install",
      devCommand: "pnpm dev",
      testCommand: "pnpm test",
      previewPorts: "3000,5173,4173,8080",
      visibleTestCommand: "pnpm test",
      hiddenTestCommand: "",
    },
  });

  const { isSubmitting } = form.formState;
  const submissionMode = form.watch("submissionMode");
  const [starterFile, setStarterFile] = useState<File | null>(null);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const dueDate =
      values?.dueDate !== "" && values?.dueDate
        ? new Date(values?.dueDate)
        : undefined;

    values.title = values.title.trim();

    try {
      const classIdValue =
        values.class && values.class.length > 0 ? values.class : undefined;
      const courseIdValue =
        courseId && courseId.length > 0 ? courseId : undefined;

      let assignmentId = attachment?.id;
      if (isEditing && attachment) {
        const updated = await updateAttachment.mutateAsync({
          id: attachment.id,
          title: values.title,
          classId: classIdValue,
          link: values.link,
          attachmentType: values.attachmentType as attachmentType,
          submissionMode: values.submissionMode as submissionMode,
          details: undefined,
          detailsJson: values.detailsJson,
          dueDate: dueDate,
          maxSubmissions: values?.maxSubmissions
            ? parseInt(values.maxSubmissions)
            : 1,
          courseId: courseIdValue,
        });
        assignmentId = updated.data?.id ?? attachment.id;
        toast.success("Assignment updated");
      } else {
        const created = await createAttachment.mutateAsync({
          title: values.title,
          classId: classIdValue,
          link: values.link,
          attachmentType: values.attachmentType as attachmentType,
          submissionMode: values.submissionMode as submissionMode,
          details: undefined,
          detailsJson: values.detailsJson,
          dueDate: dueDate,
          maxSubmissions: values?.maxSubmissions
            ? parseInt(values.maxSubmissions)
            : 1,
          courseId: courseIdValue,
        });
        assignmentId = created.data?.id;
        toast.success("Assignment created");
      }

      if (values.submissionMode === "WORKSPACE" && assignmentId) {
        const previewPorts =
          values.previewPorts
            ?.split(",")
            .map((port) => Number(port.trim()))
            .filter((port) => Number.isInteger(port) && port > 0) ?? [];
        const testCases = [
          values.visibleTestCommand
            ? {
                title: "Visible tests",
                visibility: "VISIBLE" as const,
                command: values.visibleTestCommand,
                points: 50,
                timeoutMs: 120000,
              }
            : null,
          values.hiddenTestCommand
            ? {
                title: "Hidden tests",
                visibility: "HIDDEN" as const,
                command: values.hiddenTestCommand,
                points: 50,
                timeoutMs: 180000,
              }
            : null,
        ].filter(Boolean) as Array<{
          title: string;
          visibility: "VISIBLE" | "HIDDEN";
          command: string;
          points: number;
          timeoutMs: number;
        }>;

        await updateWorkspaceConfig.mutateAsync({
          assignmentId,
          framework: "web",
          setupCommand: values.setupCommand || "pnpm install",
          devCommand: values.devCommand || "pnpm dev",
          testCommand:
            values.testCommand || values.visibleTestCommand || "pnpm test",
          previewPorts: previewPorts.length
            ? previewPorts
            : [3000, 5173, 4173, 8080],
          readonlyPaths: [".tutly/**"],
          defaultProvider: "LOCAL",
          testCases,
          grading: {
            autoScore: true,
            hiddenRequiresTrustedRunner: Boolean(values.hiddenTestCommand),
          },
          publicTestMetadata: {
            visibleCommand: values.visibleTestCommand || values.testCommand,
          },
        });

        if (starterFile) {
          const checksum = await sha256Hex(starterFile);
          const upload = await createStarterUpload.mutateAsync({
            assignmentId,
            artifact: {
              kind: "STARTER",
              fileName: starterFile.name,
              mimeType: starterFile.type || "application/zip",
              sizeBytes: starterFile.size,
              checksum,
              manifest: {
                uploadedFrom: "assignment-editor",
                uploadedAt: new Date().toISOString(),
              },
            },
          });

          if (upload.data?.uploadUrl && upload.data?.artifact?.id) {
            await fetch(upload.data.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type": starterFile.type || "application/zip",
              },
              body: starterFile,
            });
            await confirmArtifactUpload.mutateAsync({
              artifactId: upload.data.artifact.id,
              checksum,
            });
          }
        }
      }

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      toast.error(
        isEditing
          ? "Failed to update assignment"
          : "Failed to create assignment",
      );
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <FormField
            name="title"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base" htmlFor="title">
                  Title
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    disabled={isSubmitting}
                    placeholder="eg., Assignment 1"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="attachmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Attachment type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        className="text-base"
                        placeholder="Select a type"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover text-popover-foreground text-base">
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="ASSIGNMENT"
                    >
                      Assignment
                    </SelectItem>
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="ZOOM"
                    >
                      Zoom
                    </SelectItem>
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="GITHUB"
                    >
                      Github
                    </SelectItem>
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="OTHERS"
                    >
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
          <FormField
            name="maxSubmissions"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Max Submissions</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    className="text-base"
                    min="0"
                    disabled={isSubmitting}
                    placeholder="eg., max Submissions..."
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="submissionMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Submission Mode</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        className="text-base"
                        placeholder="Select a type"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover text-popover-foreground text-base">
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="SANDBOX"
                    >
                      Sandbox
                    </SelectItem>
                    <SelectItem
                      className="cursor-pointer text-base"
                      value="EXTERNAL_LINK"
                    >
                      External link
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
          <FormField
            name="dueDate"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Due Date{" "}
                  <span className="text-sm opacity-80">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-base"
                    disabled={isSubmitting}
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="class"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  Assign a class{" "}
                  <span className="text-sm opacity-80">(optional)</span>
                </FormLabel>
                <Select
                  onValueChange={(v) =>
                    field.onChange(v === "__none__" ? "" : v)
                  }
                  defaultValue={field.value || "__none__"}
                  value={field.value || "__none__"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        className="text-base"
                        placeholder="Select a class"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover text-popover-foreground text-base">
                    <SelectItem
                      value="__none__"
                      className="text-muted-foreground cursor-pointer text-base"
                    >
                      No class — link later
                    </SelectItem>
                    {(classes || []).map((c: any) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="cursor-pointer text-base"
                      >
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="font-bold text-red-700" />
              </FormItem>
            )}
          />
        </div>
        <FormField
          name="link"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Link</FormLabel>
              <FormControl>
                <Input
                  className="text-base"
                  disabled={isSubmitting}
                  placeholder="Paste Link here..."
                  {...field}
                />
              </FormControl>
              <FormMessage className="font-bold text-red-700" />
            </FormItem>
          )}
        />
        {submissionMode === "WORKSPACE" && (
          <div className="border-border bg-muted/30 grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <FormField
              name="setupCommand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Setup command</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="devCommand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Dev command</FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="testCommand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Default test command
                  </FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="previewPorts"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Preview ports</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="3000,5173"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="visibleTestCommand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Visible test command
                  </FormLabel>
                  <FormControl>
                    <Input disabled={isSubmitting} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              name="hiddenTestCommand"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">
                    Hidden test command
                  </FormLabel>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      placeholder="Runs only on trusted runner"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="space-y-2 md:col-span-2">
              <FormLabel className="text-base">Starter template ZIP</FormLabel>
              <Input
                type="file"
                accept=".zip,application/zip"
                disabled={isSubmitting}
                onChange={(event) =>
                  setStarterFile(event.target.files?.[0] ?? null)
                }
              />
            </div>
          </div>
        )}
        <FormField
          name="details"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base">Details</FormLabel>
              <FormControl>
                <RichTextEditor
                  initialValue={
                    attachment?.detailsJson ?? attachment?.details ?? ""
                  }
                  onChange={(jsonValue) => {
                    form.setValue(
                      "detailsJson",
                      jsonValue ? JSON.parse(jsonValue) : null,
                    );
                  }}
                  allowUpload={true}
                  fileUploadOptions={{
                    fileType: FileType.ATTACHMENT,
                    associatingId: attachment?.id ?? "",
                    allowedExtensions: [
                      "jpeg",
                      "jpg",
                      "png",
                      "gif",
                      "svg",
                      "webp",
                    ],
                  }}
                />
              </FormControl>
              <FormMessage className="font-bold text-red-700" />
            </FormItem>
          )}
        />
        <div className="flex items-center gap-x-3">
          <Button
            className="bg-red-700 hover:bg-red-800"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel ?? (() => router.back())}
            // variant="destructive"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-gray-600 hover:bg-gray-700"
          >
            {isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default NewAttachmentPage;
