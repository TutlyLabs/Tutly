"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const experienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role is required"),
  workLocation: z.string().optional(),
  workCity: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
});

const formSchema = z.object({
  experiences: z.array(experienceSchema),
});

interface ExperienceProps {
  experiences: Array<Record<string, any>>;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

export default function Experience({ experiences, onUpdate }: ExperienceProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      experiences: experiences || [
        {
          company: "",
          role: "",
          workLocation: "",
          workCity: "",
          startDate: new Date(),
        },
      ],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        experiences:
          values.experiences?.map((exp) => ({
            ...exp,
            startDate: exp.startDate.toISOString(),
            endDate: exp.endDate?.toISOString(),
          })) ?? [],
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  const addExperience = () => {
    const experiences = form.getValues("experiences");
    form.setValue("experiences", [
      ...experiences,
      {
        company: "",
        role: "",
        workLocation: "",
        workCity: "",
        startDate: new Date(),
      },
    ]);
  };

  const removeExperience = (index: number) => {
    const experiences = form.getValues("experiences");
    form.setValue(
      "experiences",
      experiences.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Experience</h2>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {form.watch("experiences").map((_, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`experiences.${index}.company`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter company name"
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
                      name={`experiences.${index}.role`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter role"
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
                      name={`experiences.${index}.workLocation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter work location"
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
                      name={`experiences.${index}.workCity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter city"
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
                      name={`experiences.${index}.startDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onChange={field.onChange}
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`experiences.${index}.endDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value}
                              onChange={field.onChange}
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {isEditing && index > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="mt-4"
                      onClick={() => removeExperience(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Experience
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {isEditing && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button type="button" variant="outline" onClick={addExperience}>
                <Plus className="mr-2 h-4 w-4" />
                Add Experience
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
