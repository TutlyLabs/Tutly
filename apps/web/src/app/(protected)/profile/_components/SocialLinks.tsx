"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@/lib/prisma";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaQuora } from "react-icons/fa";
import {
  RiFacebookBoxLine,
  RiGlobalLine,
  RiLinkedinBoxLine,
  RiTwitterLine,
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

interface SocialLinksProps {
  socialLinks: Record<string, string>;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

const formSchema = z.object({
  facebook: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("facebook.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  linkedin: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("linkedin.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  twitter: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("twitter.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  quora: z
    .string()
    .refine(
      (val) => !val.includes("/") && !val.includes("quora.com"),
      "Please enter only username",
    )
    .optional()
    .or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
});

export default function SocialLinks({
  socialLinks,
  onUpdate,
}: SocialLinksProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      facebook: socialLinks?.facebook || "",
      linkedin: socialLinks?.linkedin || "",
      twitter: socialLinks?.twitter || "",
      quora: socialLinks?.quora || "",
      website: socialLinks?.website || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        socialLinks: values,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Social Links</h2>
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
              name="facebook"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiFacebookBoxLine className="h-5 w-5" />
                    Facebook Username
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
              name="linkedin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiLinkedinBoxLine className="h-5 w-5" />
                    LinkedIn Username
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
              name="twitter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiTwitterLine className="h-5 w-5" />
                    Twitter Username
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
              name="quora"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FaQuora className="h-5 w-5" />
                    Quora Username
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
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <RiGlobalLine className="h-5 w-5" />
                    Personal Website
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://yourwebsite.com"
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
