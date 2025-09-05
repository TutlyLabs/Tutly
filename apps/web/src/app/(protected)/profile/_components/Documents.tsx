"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@prisma/client";
import { FileType } from "@prisma/client";
import { Loader2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import Link from "next/link";

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
import { useFileUpload } from "@/components/useFileUpload";
import { api } from "@/trpc/react";

const formSchema = z.object({
  resume: z.string().optional(),
});

interface DocumentsProps {
  documents: Record<string, string>;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

export default function Documents({ documents, onUpdate }: DocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { uploadFile } = useFileUpload({
    fileType: FileType.OTHER,
    onUpload: async (file) => {
      if (!file?.publicUrl) return;
      try {
        await onUpdate({
          documents: {
            resume: file.publicUrl,
          },
        });
        toast.success("Resume uploaded successfully");
        window.location.reload();
      } catch (error) {
        toast.error("Failed to upload resume");
      }
    },
  });

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);

    try {
      const file = e.target.files[0];
      if (!file) return;
      await uploadFile(file);
    } catch (error) {
      toast.error("Failed to upload resume");
    } finally {
      setIsUploading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resume: documents?.resume || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        documents: values,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-2xl font-semibold">Documents</h2>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
          className="h-10"
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-8">
            <FormField
              control={form.control}
              name="resume"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-lg">Resume</FormLabel>
                  <FormControl>
                    <div className="flex min-h-[100px] items-center gap-6 rounded-lg border p-6">
                      <div className="relative flex-1">
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          ref={fileInputRef}
                          onChange={handleUpload}
                          disabled={!isEditing || isUploading}
                          className="file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 h-18 p-2 file:mr-6 file:rounded-lg file:border-0 file:px-6 file:py-3 file:text-sm file:font-medium"
                        />
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/10">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        )}
                      </div>
                      {field.value && (
                        <Link
                          href={field.value}
                          className="text-lg text-blue-500 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Current Resume
                        </Link>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isEditing && (
            <Button type="submit" className="h-12 w-full text-lg md:w-auto">
              <Upload className="mr-3 h-5 w-5" />
              Upload Documents
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
