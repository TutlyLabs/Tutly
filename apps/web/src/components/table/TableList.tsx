import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Edit2, Eye, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Column, IAction } from "./DisplayTable";

interface TableListProps {
  columns: Column[];
  data: Record<string, any>[];
  actions: IAction[];
  onEdit?: ((row: Record<string, any>) => Promise<any>) | null;
  onDelete?: ((row: Record<string, any>) => Promise<any>) | null;
  onView?: ((row: Record<string, any>) => Promise<any>) | null;
  onSort: (key: string) => void;
  onEditClick: (row: Record<string, any>) => void;
  onDeleteClick: (row: Record<string, any>) => void;
  handleAction: (action: IAction, row: Record<string, any>) => Promise<void>;
}

const TableList = ({
  columns,
  data,
  actions,
  onEdit,
  onDelete,
  onView,
  onSort,
  onEditClick,
  onDeleteClick,
  handleAction,
}: TableListProps) => {
  const handleView = (row: Record<string, any>) => {
    if (onView) {
      void onView(row);
    }
  };

  const handleSort = (key: string) => {
    onSort(key);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns
              .filter((column) => !column.hidden && !column.hideInTable)
              .map((column) => (
                <TableHead
                  key={column.key}
                  className={column.sortable ? "cursor-pointer" : ""}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    <span>{column.label || column.name}</span>
                    {column.sortable && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            {(actions.length > 0 || onEdit || onDelete || onView) && (
              <TableHead>Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns
                .filter((column) => !column.hidden && !column.hideInTable)
                .map((column) => (
                  <TableCell key={`${index}-${column.key}`}>
                    {column.render
                      ? column.render(row[column.key], row)
                      : row[column.key]}
                  </TableCell>
                ))}
              {(actions.length > 0 || onEdit || onDelete || onView) && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action) => (
                          <DropdownMenuItem
                            key={action.label}
                            onClick={() => void handleAction(action, row)}
                            className={
                              action.variant === "destructive"
                                ? "text-destructive"
                                : ""
                            }
                          >
                            <div className="flex items-center">
                              {action.icon}
                              {action.label}
                            </div>
                          </DropdownMenuItem>
                        ))}
                        {actions.length > 0 &&
                          (onView || onEdit || onDelete) && (
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
                          <DropdownMenuItem onClick={() => onEditClick(row)}>
                            <div className="flex items-center">
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </div>
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDeleteClick(row)}>
                            <div className="flex items-center">
                              <Trash2 className="text-destructive mr-2 h-4 w-4" />
                              Delete
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TableList;
