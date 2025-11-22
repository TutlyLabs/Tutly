"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Attachment } from "@prisma/client";
import type { attachmentType, submissionMode } from "@prisma/client";
import { FileType } from "@prisma/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useRouter } from "next/navigation";

import RichTextEditor from "@/components/editor/RichTextEditor";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

const formSchema = z.object({
  title: z.string().min(1, {
    message: "Title is required",
  }),
  link: z.string().optional(),
  attachmentType: z.string().min(1, {
    message: "Type is required",
  }),
  class: z.string().min(1, {
    message: "class is required",
  }),
  submissionMode: z.string().min(1, {
    message: "Submission mode is required",
  }),
  courseId: z.string().optional(),
  details: z.string().optional(),
  detailsJson: z.any().optional(),
  dueDate: z.string().optional(),
  maxSubmissions: z.string().optional(),
});

interface NewAttachmentPageProps {
  classes: any;
  courseId: string;
  classId: string;
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
  const updateFileAssociatingId =
    api.fileupload.updateAssociatingId.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: attachment?.title ?? "",
      link: attachment?.link ?? "",
      attachmentType: attachment?.attachmentType ?? "ASSIGNMENT",
      submissionMode: attachment?.submissionMode ?? "",
      class: classId ?? attachment?.classId ?? "",
      courseId: courseId ?? "",
      details: attachment?.details ?? "",
      detailsJson: attachment?.detailsJson ?? null,
      dueDate: attachment?.dueDate
        ? new Date(attachment.dueDate).toISOString().split("T")[0]
        : "",
      maxSubmissions: attachment?.maxSubmissions?.toString() ?? "1",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const dueDate =
      values?.dueDate !== "" && values?.dueDate
        ? new Date(values?.dueDate)
        : undefined;

    values.title = values.title.trim();

    try {
      if (isEditing && attachment) {
        await updateAttachment.mutateAsync({
          id: attachment.id,
          title: values.title,
          classId: values.class,
          link: values.link,
          attachmentType: values.attachmentType as attachmentType,
          submissionMode: values.submissionMode as submissionMode,
          details: undefined,
          detailsJson: values.detailsJson,
          dueDate: dueDate,
          maxSubmissions: values?.maxSubmissions
            ? parseInt(values.maxSubmissions)
            : 1,
          courseId: courseId,
        });
        toast.success("Assignment updated");
      } else {
        await createAttachment.mutateAsync({
          title: values.title,
          classId: values.class,
          link: values.link,
          attachmentType: values.attachmentType as attachmentType,
          submissionMode: values.submissionMode as submissionMode,
          details: undefined,
          detailsJson: values.detailsJson,
          dueDate: dueDate,
          maxSubmissions: values?.maxSubmissions
            ? parseInt(values.maxSubmissions)
            : 1,
          courseId: courseId,
        });
        toast.success("Assignment created");
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
                  <SelectContent className="bg-secondary-700 bg-background text-base text-white">
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="ASSIGNMENT"
                    >
                      Assignment
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="ZOOM"
                    >
                      Zoom
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="GITHUB"
                    >
                      Github
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
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
                  <SelectContent className="bg-secondary-700 bg-background text-base text-white">
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="HTML_CSS_JS"
                    >
                      HTML CSS JS
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="GIT"
                    >
                      GIT
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="SANDBOX"
                    >
                      SANDBOX
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-secondary-800 text-base"
                      value="EXTERNAL_LINK"
                    >
                      EXTERNAL LINK
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
                <FormLabel className="text-base">Assign a class</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        className="text-base"
                        placeholder="Select a class"
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-secondary-700 bg-background text-base text-white">
                    {(classes || []).map((c: any) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="hover:bg-secondary-800 text-base"
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

export default NewAttachmentPage;
