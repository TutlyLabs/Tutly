"use client";

import { MoreVertical, Pencil, X } from "lucide-react";

import { Button } from "@tutly/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@tutly/ui/dropdown-menu";

interface SectionHeaderProps {
  title: string;
  description?: string;
  isEditing: boolean;
  onToggle: () => void;
  extraActions?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  isEditing,
  onToggle,
  extraActions,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-foreground text-base font-semibold sm:text-lg">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
            {description}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`${title} options`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onToggle} className="cursor-pointer">
            {isEditing ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </>
            )}
          </DropdownMenuItem>
          {extraActions}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
