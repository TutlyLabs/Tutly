"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  RiCodeBoxLine,
  RiCodeLine,
  RiCodeSSlashLine,
  RiGithubLine,
  RiTerminalBoxLine,
} from "react-icons/ri";
import * as z from "zod";

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
import { api } from "@/trpc/react";

const formSchema = z.object({
  github: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("github.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  interviewbit: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("interviewbit.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  leetcode: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("leetcode.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  codechef: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("codechef.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  codeforces: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("codeforces.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  hackerrank: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("hackerrank.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
});

interface ProfessionalProfilesProps {
  professionalProfiles: Record<string, string>;
  onUpdate: (profile: {
    professionalProfiles: Record<string, string>;
  }) => Promise<void>;
}

export default function ProfessionalProfiles({
  professionalProfiles,
  onUpdate,
}: ProfessionalProfilesProps) {
  const [isEditing, setIsEditing] = useState(false);

  const { mutate: validateHandles } =
    api.codingPlatforms.validatePlatformHandles.useMutation({
      onSuccess: async (data) => {
        if (!data.valid) {
          toast.error(`Invalid handles: ${data.invalidFields.join(", ")}`);
          return;
        }
        toast.dismiss();
        await onUpdate({
          professionalProfiles: form.getValues(),
        });
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.message || "Something went wrong");
      },
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      github: professionalProfiles?.github ?? "",
      interviewbit: professionalProfiles?.interviewbit ?? "",
      leetcode: professionalProfiles?.leetcode ?? "",
      codechef: professionalProfiles?.codechef ?? "",
      codeforces: professionalProfiles?.codeforces ?? "",
      hackerrank: professionalProfiles?.hackerrank ?? "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const validationValues = Object.fromEntries(
        Object.entries(values).filter(
          ([_, value]) => value !== "" && value !== undefined,
        ),
      );
      toast.loading("Validating handles...");
      validateHandles({
        handles: validationValues as Record<string, string>,
      });
    } catch (error) {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Professional Profiles</h2>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="leetcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiCodeBoxLine className="h-5 w-5" />
                    LeetCode Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codechef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiCodeSSlashLine className="h-5 w-5" />
                    CodeChef Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="codeforces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiTerminalBoxLine className="h-5 w-5" />
                    Codeforces Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hackerrank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiCodeLine className="h-5 w-5" />
                    HackerRank Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="interviewbit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiCodeLine className="h-5 w-5" />
                    InterviewBit Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="github"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiGithubLine className="h-5 w-5" />
                    GitHub Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="username"
                      {...field}
                      disabled={!isEditing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {isEditing && (
            <Button type="submit" className="w-full md:w-auto">
              Save Changes
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
