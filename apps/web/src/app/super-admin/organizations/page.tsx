"use client";

import { api } from "@/trpc/react";
import { StatusBadge } from "../_components/StatusBadge";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useQueryState } from "nuqs";

export default function OrganizationsPage() {
  const [search, setSearch] = useQueryState("search", { defaultValue: "" });
  const [statusFilter, setStatusFilter] = useQueryState("status", {
    defaultValue: "",
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = api.superAdmin.listOrganizations.useQuery({
    page,
    limit: 10,
    search: search || undefined,
    status: (statusFilter as any) || undefined,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all organizations on the platform.
          </p>
        </div>
        <Link
          href="/super-admin/organizations/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Organization
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by name, code, or subdomain..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="bg-background border-border focus:border-primary focus:ring-primary/40 w-full rounded-lg border py-2 pr-4 pl-10 text-sm focus:ring-1 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-background border-border focus:border-primary rounded-lg border px-3 py-2 text-sm focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card overflow-hidden rounded-xl border">
        {isLoading ? (
          <div className="space-y-4 p-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Organization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Domains
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/super-admin/organizations/detail?id=${org.id}`}
                        className="text-foreground hover:text-primary font-medium"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
                        {org.orgCode}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {org._count.users}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {org._count.domains}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={org.status} />
                    </td>
                  </tr>
                ))}
                {data?.organizations.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-muted-foreground"
                    >
                      No organizations found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 dark:border-gray-800">
                <p className="text-sm text-muted-foreground">
                  Page {data.currentPage} of {data.totalPages} (
                  {data.totalCount} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= (data?.totalPages ?? 1)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
