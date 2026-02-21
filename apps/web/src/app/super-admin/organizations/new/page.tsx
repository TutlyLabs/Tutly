"use client";

import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    orgCode: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    subdomain: "",
    status: "PENDING" as const,
  });

  const createOrg = api.superAdmin.createOrganization.useMutation({
    onSuccess: (data) => {
      toast.success("Organization created successfully!");
      router.push(`/super-admin/organizations/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrg.mutate({
      ...formData,
      subdomain: formData.subdomain || undefined,
      contactEmail: formData.contactEmail || undefined,
      contactPhone: formData.contactPhone || undefined,
      website: formData.website || undefined,
      description: formData.description || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          New Organization
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Onboard a new organization to the platform.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Organization Name *"
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
            required
          />
          <FormField
            label="Org Code *"
            value={formData.orgCode}
            onChange={(v) =>
              setFormData({ ...formData, orgCode: v.toUpperCase() })
            }
            placeholder="e.g. ACME"
            required
          />
        </div>

        <FormField
          label="Description"
          value={formData.description}
          onChange={(v) => setFormData({ ...formData, description: v })}
          multiline
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Contact Email"
            type="email"
            value={formData.contactEmail}
            onChange={(v) => setFormData({ ...formData, contactEmail: v })}
          />
          <FormField
            label="Contact Phone"
            value={formData.contactPhone}
            onChange={(v) => setFormData({ ...formData, contactPhone: v })}
          />
        </div>

        <FormField
          label="Website"
          value={formData.website}
          onChange={(v) => setFormData({ ...formData, website: v })}
          placeholder="https://example.com"
        />

        <FormField
          label="Subdomain"
          value={formData.subdomain}
          onChange={(v) =>
            setFormData({
              ...formData,
              subdomain: v.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            })
          }
          placeholder="acme"
          hint="Will be accessible at acme.tutly.in (can be set later)"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Initial Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as any })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createOrg.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {createOrg.isPending ? "Creating..." : "Create Organization"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  hint?: string;
}) {
  const className =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={className}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={className}
        />
      )}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
