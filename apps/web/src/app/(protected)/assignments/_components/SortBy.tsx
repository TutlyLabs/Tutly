"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useRouter } from "next/navigation";

const SortBy = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = new URLSearchParams(searchParams.toString());

  const handleValueChange = (value: string) => {
    params.set("sortBy", value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center border-b p-1 sm:p-2">
      <p className="text-sm font-semibold text-nowrap max-sm:hidden">Sort by</p>
      <div className="sm:ml-2">
        <Select
          defaultValue={searchParams.get("sortBy") || "username"}
          onValueChange={handleValueChange}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Select sorting option" />
          </SelectTrigger>
          <SelectContent className="text-xs">
            <SelectItem value="username">Username</SelectItem>
            <SelectItem value="submissionDate">Submission Date</SelectItem>
            <SelectItem value="points">Points</SelectItem>
            <SelectItem value="submissionIndex">Submission Index</SelectItem>
            <SelectItem value="submissionCount">Submission Count</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default SortBy;
