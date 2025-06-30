"use client";

import { Edit2, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Column, IAction } from "./DisplayTable";

interface GridViewProps {
  data: Record<string, any>[];
  columns: Column[];
  actions: IAction[];
  onEdit?: ((data: any) => Promise<any>) | null;
  onDelete?: ((data: any) => Promise<any>) | null;
  onView?: ((data: any) => Promise<any>) | null;
  gridViewRender?: (data: Record<string, any>[]) => React.ReactNode;
  setSelectedRow: (row: Record<string, any> | null) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setIsDeleteModalOpen: (open: boolean) => void;
  handleView: (row: Record<string, any>) => void;
  handleAction: (action: IAction, row: Record<string, any>) => Promise<void>;
}

export default function GridView({
  data,
  columns,
  actions,
  onEdit,
  onDelete,
  onView,
  gridViewRender,
  setSelectedRow,
  setIsEditModalOpen,
  setIsDeleteModalOpen,
  handleView,
  handleAction,
}: GridViewProps) {
  if (gridViewRender) {
    const dataWithActions = data.map((row) => ({
      ...row,
      __actions: (
        <div className="absolute top-2 right-2">
          {(actions.length > 0 || onEdit || onDelete || onView) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={() => void handleAction(action, row)}
                    className={
                      action.variant === "destructive" ? "text-destructive" : ""
                    }
                  >
                    <div className="flex items-center">
                      {action.icon}
                      {action.label}
                    </div>
                  </DropdownMenuItem>
                ))}
                {actions.length > 0 && (onView || onEdit || onDelete) && (
                  <DropdownMenuSeparator className="my-2" />
                )}
                {onView && (
                  <DropdownMenuItem onClick={() => handleView(row)}>
                    <div className="flex items-center">
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </div>
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedRow(row);
                      setIsEditModalOpen(true);
                    }}
                  >
                    <div className="flex items-center">
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </div>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedRow(row);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <div className="flex items-center">
                      <Trash2 className="text-destructive mr-2 h-4 w-4" />
                      Delete
                    </div>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ),
    }));
    return gridViewRender(dataWithActions);
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((row, index) => (
        <div
          key={index}
          className="bg-background relative rounded-lg border p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="space-y-2 pt-4">
            {columns
              .filter((column) => !column.hidden)
              .map((column) => (
                <div
                  key={column.key}
                  className="flex items-center justify-between"
                >
                  <div className="text-muted-foreground text-sm font-medium">
                    {column.label || column.name}:
                  </div>
                  <div className="text-sm">
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
