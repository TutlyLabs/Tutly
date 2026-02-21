"use client";

import { api } from "@/trpc/react";
import { StatusBadge } from "../../_components/StatusBadge";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";

export default function OrganizationDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const router = useRouter();
  const utils = api.useUtils();

  const { data: org, isLoading } = api.superAdmin.getOrganization.useQuery({
    orgId,
  });

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});

  const updateOrg = api.superAdmin.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success("Organization updated");
      setEditing(false);
      utils.superAdmin.getOrganization.invalidate({ orgId });
    },
    onError: (err) => toast.error(err.message),
  });

  // Domain management
  const [showSubdomainForm, setShowSubdomainForm] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState("");
  const [showCustomDomainForm, setShowCustomDomainForm] = useState(false);
  const [newCustomDomain, setNewCustomDomain] = useState("");

  const provisionSubdomain = api.superAdmin.provisionSubdomain.useMutation({
    onSuccess: () => {
      toast.success("Subdomain provisioned!");
      setShowSubdomainForm(false);
      setNewSubdomain("");
      utils.superAdmin.getOrganization.invalidate({ orgId });
    },
    onError: (err) => toast.error(err.message),
  });

  const addCustomDomain = api.superAdmin.addCustomDomain.useMutation({
    onSuccess: () => {
      toast.success("Custom domain added — verify DNS to activate.");
      setShowCustomDomainForm(false);
      setNewCustomDomain("");
      utils.superAdmin.getOrganization.invalidate({ orgId });
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyDomain = api.superAdmin.verifyDomain.useMutation({
    onSuccess: (result) => {
      if (result.verified) {
        toast.success("Domain verified and activated!");
      } else {
        toast.error("DNS not yet configured. Please check your records.");
      }
      utils.superAdmin.getOrganization.invalidate({ orgId });
    },
    onError: (err) => toast.error(err.message),
  });

  const removeDomain = api.superAdmin.removeDomain.useMutation({
    onSuccess: () => {
      toast.success("Domain removed");
      utils.superAdmin.getOrganization.invalidate({ orgId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-20 text-center text-gray-500">
        Organization not found.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {org.name}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {org.orgCode}
            </code>
            <StatusBadge status={org.status} />
            <span className="text-sm text-gray-500">
              {org._count.users} users
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/super-admin/users?orgId=${org.id}`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            View Users
          </Link>
          <button
            onClick={() => {
              if (editing) {
                updateOrg.mutate({ orgId, ...editData } as any);
              } else {
                setEditData({
                  name: org.name,
                  description: org.description || "",
                  contactEmail: org.contactEmail || "",
                  contactPhone: org.contactPhone || "",
                  website: org.website || "",
                  status: org.status,
                });
                setEditing(true);
              }
            }}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {editing ? "Save Changes" : "Edit"}
          </button>
        </div>
      </div>

      {/* Org Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Details
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {editing ? (
            <>
              <EditField
                label="Name"
                value={editData.name || ""}
                onChange={(v) => setEditData({ ...editData, name: v })}
              />
              <EditField
                label="Status"
                value={editData.status || ""}
                onChange={(v) => setEditData({ ...editData, status: v })}
                type="select"
                options={["PENDING", "ACTIVE", "SUSPENDED", "ARCHIVED"]}
              />
              <EditField
                label="Contact Email"
                value={editData.contactEmail || ""}
                onChange={(v) => setEditData({ ...editData, contactEmail: v })}
              />
              <EditField
                label="Contact Phone"
                value={editData.contactPhone || ""}
                onChange={(v) => setEditData({ ...editData, contactPhone: v })}
              />
              <div className="col-span-2">
                <EditField
                  label="Description"
                  value={editData.description || ""}
                  onChange={(v) => setEditData({ ...editData, description: v })}
                />
              </div>
              <EditField
                label="Website"
                value={editData.website || ""}
                onChange={(v) => setEditData({ ...editData, website: v })}
              />
            </>
          ) : (
            <>
              <DetailField label="Name" value={org.name} />
              <DetailField label="Org Code" value={org.orgCode} />
              <DetailField label="Contact Email" value={org.contactEmail} />
              <DetailField label="Contact Phone" value={org.contactPhone} />
              <DetailField label="Description" value={org.description} />
              <DetailField label="Website" value={org.website} />
              <DetailField
                label="Created"
                value={new Date(org.createdAt).toLocaleDateString()}
              />
            </>
          )}
        </div>
        {editing && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setEditing(false)}
              className="mr-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Domains Section */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Domains
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSubdomainForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Subdomain
            </button>
            <button
              onClick={() => setShowCustomDomainForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Custom Domain
            </button>
          </div>
        </div>

        {/* Add subdomain form */}
        {showSubdomainForm && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                provisionSubdomain.mutate({ orgId, subdomain: newSubdomain });
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subdomain
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newSubdomain}
                    onChange={(e) =>
                      setNewSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    placeholder="acme"
                    className="rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                  <span className="rounded-r-lg border border-l-0 border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                    .tutly.in
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newSubdomain || provisionSubdomain.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {provisionSubdomain.isPending ? "Provisioning..." : "Provision"}
              </button>
              <button
                type="button"
                onClick={() => setShowSubdomainForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Add custom domain form */}
        {showCustomDomainForm && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCustomDomain.mutate({ orgId, domain: newCustomDomain });
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={newCustomDomain}
                  onChange={(e) => setNewCustomDomain(e.target.value)}
                  placeholder="learn.acme.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={!newCustomDomain || addCustomDomain.isPending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {addCustomDomain.isPending ? "Adding..." : "Add Domain"}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomDomainForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Domains list */}
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {org.domains.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No domains configured. Add a subdomain or custom domain above.
            </div>
          )}
          {org.domains.map((domain) => (
            <div key={domain.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {domain.domain}
                    </p>
                    <p className="text-xs text-gray-500">
                      {domain.domainType === "SUBDOMAIN"
                        ? "Subdomain"
                        : "Custom Domain"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={domain.status} />
                  {domain.status === "PENDING_VERIFICATION" && (
                    <button
                      onClick={() =>
                        verifyDomain.mutate({ domainId: domain.id })
                      }
                      disabled={verifyDomain.isPending}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${verifyDomain.isPending ? "animate-spin" : ""}`}
                      />
                      Verify
                    </button>
                  )}
                  {domain.status !== "REMOVED" && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${domain.domain}? This will delete the DNS record.`,
                          )
                        ) {
                          removeDomain.mutate({ domainId: domain.id });
                        }
                      }}
                      className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* DNS instructions for pending custom domains */}
              {domain.domainType === "CUSTOM" &&
                domain.status === "PENDING_VERIFICATION" &&
                domain.cnameTarget && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-400">
                      DNS Configuration Required
                    </p>
                    <p className="mb-3 text-xs text-amber-700 dark:text-amber-500">
                      Add this record to your DNS provider:
                    </p>
                    <div className="overflow-hidden rounded border border-amber-200 dark:border-amber-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-amber-100 dark:bg-amber-900/40">
                            <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-400">
                              Type
                            </th>
                            <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-400">
                              Name
                            </th>
                            <th className="px-3 py-1.5 text-left font-medium text-amber-800 dark:text-amber-400">
                              Value
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-2 text-amber-700 dark:text-amber-500">
                              CNAME
                            </td>
                            <td className="px-3 py-2 font-mono text-amber-700 dark:text-amber-500">
                              {domain.domain.split(".")[0]}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <code className="font-mono text-amber-700 dark:text-amber-500">
                                  {domain.cnameTarget}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      domain.cnameTarget!,
                                    );
                                    toast.success("Copied!");
                                  }}
                                  className="text-amber-500 hover:text-amber-700"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "select";
  options?: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {type === "select" && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      )}
    </div>
  );
}
