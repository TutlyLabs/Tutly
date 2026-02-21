"use client";

import { api } from "@/trpc/react";
import { Building2, Globe, Users, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "./_components/StatusBadge";

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = api.superAdmin.dashboardStats.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform-wide overview of all organizations and users.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Organizations"
          value={stats?.orgCount ?? 0}
          icon={Building2}
          color="indigo"
          href="/super-admin/organizations"
        />
        <StatCard
          title="Total Users"
          value={stats?.userCount ?? 0}
          icon={Users}
          color="emerald"
          href="/super-admin/users"
        />
        <StatCard
          title="Active Domains"
          value={stats?.activeDomainsCount ?? 0}
          icon={Globe}
          color="sky"
          href="/super-admin/domains"
        />
        <StatCard
          title="Pending Orgs"
          value={stats?.pendingOrgsCount ?? 0}
          icon={Clock}
          color="amber"
          href="/super-admin/organizations?status=PENDING"
        />
      </div>

      {/* Recent organizations */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Organizations
          </h2>
          <Link
            href="/super-admin/organizations"
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {stats?.recentOrgs?.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-500">
              No organizations yet. Create your first one!
            </div>
          )}
          {stats?.recentOrgs?.map((org) => (
            <Link
              key={org.id}
              href={`/super-admin/organizations/${org.id}`}
              className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  {org.name[0]?.toUpperCase() || "O"}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {org.name}
                  </p>
                  <p className="text-xs text-gray-500">{org.orgCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {org._count.users} users
                </span>
                <StatusBadge status={org.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "indigo" | "emerald" | "sky" | "amber";
  href: string;
}) {
  const colorMap = {
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    sky: "bg-sky-50 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  };

  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
    >
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
