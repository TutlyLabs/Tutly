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
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
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
      <div className="bg-card rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
          <h2 className="text-foreground text-base font-semibold sm:text-lg">
            Recent Organizations
          </h2>
          <Link
            href="/super-admin/organizations"
            className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-border divide-y">
          {stats?.recentOrgs?.length === 0 && (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm sm:px-6">
              No organizations yet. Create your first one!
            </div>
          )}
          {stats?.recentOrgs?.map((org) => (
            <Link
              key={org.id}
              href={`/super-admin/organizations/detail?id=${org.id}`}
              className="flex items-center justify-between hover:bg-accent/40 px-4 py-3 transition-colors sm:px-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                  {org.name[0]?.toUpperCase() || "O"}
                </div>
                <div>
                  <p className="text-foreground font-medium">
                    {org.name}
                  </p>
                  <p className="text-muted-foreground text-xs">{org.orgCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground text-sm">
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
      className="group bg-card hover:bg-accent/30 rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-4">
        <div className={`rounded-lg p-2.5 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </Link>
  );
}
