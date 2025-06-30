"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@tutly/api/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  dateOfBirth: z.date().nullable(),
  hobbies: z.string(),
  aboutMe: z.string().max(500).optional(),
});

interface PersonalDetailsProps {
  dateOfBirth?: Date;
  hobbies: string[];
  aboutMe: string;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

export default function PersonalDetails({
  dateOfBirth,
  hobbies,
  aboutMe,
  onUpdate,
}: PersonalDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      hobbies: hobbies.join(", "),
      aboutMe: aboutMe,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        dateOfBirth: values.dateOfBirth,
        hobbies: values.hobbies.split(",").map((h) => h.trim()),
        aboutMe: values.aboutMe ?? null,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Personal Details</h2>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={!isEditing}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hobbies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hobbies</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Reading, Writing, Gaming..."
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
              name="aboutMe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About Me</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="h-32"
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
