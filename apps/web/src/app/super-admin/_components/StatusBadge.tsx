"use client";

const statusMap: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "Pending",
  },
  ACTIVE: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Active",
  },
  SUSPENDED: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Suspended",
  },
  ARCHIVED: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    label: "Archived",
  },
  PENDING_VERIFICATION: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    label: "Pending Verification",
  },
  FAILED: {
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    label: "Failed",
  },
  REMOVED: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    label: "Removed",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] ?? statusMap.PENDING!;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  );
}
