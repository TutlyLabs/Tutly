"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Profile } from "@tutly/db/browser";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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

import { SectionHeader } from "./SectionHeader";

const formSchema = z.object({
  building: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

interface AddressProps {
  address: Record<string, string>;
  onUpdate: (profile: Partial<Profile>) => Promise<void>;
}

export default function Address({ address, onUpdate }: AddressProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      building: address?.building || "",
      street: address?.street || "",
      city: address?.city || "",
      state: address?.state || "",
      country: address?.country || "",
      pincode: address?.pincode || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await onUpdate({
        address: values,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Address"
        description="Where to reach you."
        isEditing={isEditing}
        onToggle={() => setIsEditing(!isEditing)}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="building"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Building/House No.</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter building/house number"
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
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street/Area</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter street/area"
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
              name="city"
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
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter state"
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
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter country"
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
              name="pincode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pincode</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter pincode"
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
