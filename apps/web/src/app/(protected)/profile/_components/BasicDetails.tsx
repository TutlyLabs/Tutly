"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@tutly/db/browser";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import MobileInput from "@/components/MobileInput";

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

import { SectionHeader } from "./SectionHeader";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  secondaryEmail: z
    .string()
    .email("Please enter a valid email address")
    .optional(),
  mobile: z
    .string()
    .min(12, "Must include country code")
    .max(14, "Invalid mobile number")
    .refine((value) => value.startsWith("+"), "Must start with +"),
  whatsapp: z
    .string()
    .min(12, "Must include country code")
    .max(14, "Invalid WhatsApp number")
    .refine((value) => value.startsWith("+"), "Must start with +"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Please select a gender",
  }),
  tshirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"], {
    required_error: "Please select a size",
  }),
});

interface BasicDetailsProps {
  email: string;
  secondaryEmail: string;
  mobile: string;
  whatsapp: string;
  gender: string;
  tshirtSize: string;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

export default function BasicDetails({
  email,
  secondaryEmail,
  mobile,
  whatsapp,
  gender,
  tshirtSize,
  onUpdate,
}: BasicDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email || "",
      secondaryEmail: secondaryEmail || "",
      mobile: mobile || "",
      whatsapp: whatsapp || "",
      gender: gender as "male" | "female" | "other",
      tshirtSize: tshirtSize as "XS" | "S" | "M" | "L" | "XL" | "XXL",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        mobile: values?.mobile,
        whatsapp: values?.whatsapp,
        gender: values?.gender,
        tshirtSize: values?.tshirtSize,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Basic Details"
        description="Contact details and preferences."
        isEditing={isEditing}
        onToggle={() => setIsEditing(!isEditing)}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@example.com"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondaryEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@example.com"
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
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <MobileInput
                        value={field.value}
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
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <MobileInput
                        value={field.value}
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tshirtSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>T-Shirt Size</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
