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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Domains
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of all provisioned domains across organizations.
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="FAILED">Failed</option>
          <option value="REMOVED">Removed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {domains?.map((domain) => (
                <tr
                  key={domain.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
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
                      href={`/super-admin/organizations/${domain.organization.id}`}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      {domain.organization.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={domain.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(domain.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {domains?.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
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
