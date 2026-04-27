"use client";

import { api } from "@/trpc/react";
import { StatusBadge } from "../_components/StatusBadge";
import { Globe } from "lucide-react";
import Link from "next/link";
import { useQueryState } from "nuqs";

export default function DomainsPage() {
  const [statusFilter, setStatusFilter] = useQueryState("status", {
    defaultValue: "",
  });

  const { data: domains, isLoading } = api.superAdmin.listDomains.useQuery({
    status: (statusFilter as any) || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Domains
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of all provisioned domains across organizations.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border-border focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="FAILED">Failed</option>
          <option value="REMOVED">Removed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-muted h-12 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b">
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Domain
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Type
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Organization
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Status
                </th>
                <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {domains?.map((domain) => (
                <tr
                  key={domain.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="text-muted-foreground/70 h-4 w-4" />
                      <span className="text-foreground font-medium">
                        {domain.domain}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        domain.domainType === "SUBDOMAIN"
                          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}
                    >
                      {domain.domainType === "SUBDOMAIN"
                        ? "Subdomain"
                        : "Custom"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <Link
                      href={`/super-admin/organizations/detail?id=${domain.organization.id}`}
                      className="hover:text-primary/80 text-indigo-600"
                    >
                      {domain.organization.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={domain.status} />
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-sm">
                    {new Date(domain.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {domains?.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground px-6 py-8 text-center text-sm"
                  >
                    No domains found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
