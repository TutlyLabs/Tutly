"use client";

import { api } from "@/trpc/react";
import { StatusBadge } from "../../_components/StatusBadge";
import { useRouter, useSearchParams } from "next/navigation";
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
  const orgId = useSearchParams().get("id") ?? "";
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
        <Loader2 className="text-muted-foreground/70 h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-muted-foreground py-20 text-center">
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
          className="text-muted-foreground rounded-lg border border-gray-300 p-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {org.name}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <code className="bg-muted dark:text-muted-foreground/70 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {org.orgCode}
            </code>
            <StatusBadge status={org.status} />
            <span className="text-muted-foreground text-sm">
              {org._count.users} users
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/super-admin/users?orgId=${org.id}`}
            className="text-foreground/80 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
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
            className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-2 text-sm font-medium text-white"
          >
            {editing ? "Save Changes" : "Edit"}
          </button>
        </div>
      </div>

      {/* Org Details */}
      <div className="bg-card rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800">
        <h2 className="text-foreground mb-4 text-base font-semibold sm:text-lg">
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
              className="dark:text-muted-foreground/70 mr-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Domains Section */}
      <div className="bg-card rounded-xl border border-gray-200 bg-white dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Globe className="text-muted-foreground h-5 w-5" />
            <h2 className="text-foreground text-base font-semibold sm:text-lg">
              Domains
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSubdomainForm(true)}
              className="text-foreground/80 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Subdomain
            </button>
            <button
              onClick={() => setShowCustomDomainForm(true)}
              className="text-foreground/80 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Custom Domain
            </button>
          </div>
        </div>

        {/* Add subdomain form */}
        {showSubdomainForm && (
          <div className="bg-accent/40 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                provisionSubdomain.mutate({ orgId, subdomain: newSubdomain });
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="text-foreground/80 mb-1 block text-sm font-medium">
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
                    className="bg-card text-foreground rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700"
                  />
                  <span className="text-muted-foreground bg-muted rounded-r-lg border border-l-0 border-gray-300 bg-gray-100 px-3 py-2 text-sm dark:border-gray-700">
                    .tutly.in
                  </span>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newSubdomain || provisionSubdomain.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {provisionSubdomain.isPending ? "Provisioning..." : "Provision"}
              </button>
              <button
                type="button"
                onClick={() => setShowSubdomainForm(false)}
                className="dark:text-muted-foreground/70 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Add custom domain form */}
        {showCustomDomainForm && (
          <div className="bg-accent/40 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addCustomDomain.mutate({ orgId, domain: newCustomDomain });
              }}
              className="flex items-end gap-3"
            >
              <div className="flex-1">
                <label className="text-foreground/80 mb-1 block text-sm font-medium">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={newCustomDomain}
                  onChange={(e) => setNewCustomDomain(e.target.value)}
                  placeholder="learn.acme.com"
                  className="bg-card text-foreground w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700"
                />
              </div>
              <button
                type="submit"
                disabled={!newCustomDomain || addCustomDomain.isPending}
                className="bg-primary hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {addCustomDomain.isPending ? "Adding..." : "Add Domain"}
              </button>
              <button
                type="button"
                onClick={() => setShowCustomDomainForm(false)}
                className="dark:text-muted-foreground/70 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Domains list */}
        <div className="divide-border divide-y">
          {org.domains.length === 0 && (
            <div className="text-muted-foreground px-6 py-8 text-center text-sm">
              No domains configured. Add a subdomain or custom domain above.
            </div>
          )}
          {org.domains.map((domain) => (
            <div key={domain.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="text-muted-foreground/70 h-4 w-4" />
                  <div>
                    <p className="text-foreground font-medium">
                      {domain.domain}
                    </p>
                    <p className="text-muted-foreground text-xs">
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
                      className="text-muted-foreground/70 rounded-md p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
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
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-foreground mt-0.5 text-sm">{value || "—"}</p>
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
      <label className="text-muted-foreground mb-1 block text-xs font-medium">
        {label}
      </label>
      {type === "select" && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-muted text-foreground w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700"
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
          className="bg-muted text-foreground w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700"
        />
      )}
    </div>
  );
}
