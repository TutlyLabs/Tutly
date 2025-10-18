"use client";

import {
  Filter,
  ImportIcon,
  LayoutGrid,
  Plus,
  Table as TableIcon,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useQueryState } from "nuqs";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { AdvancedCrudDialog } from "./AdvancedCrudDialog";
import BulkImport from "./BulkImport";
import { Pagination } from "./Pagination";
import { DeleteConfirmation } from "./DeleteConfirmationDialog";
import ViewModal from "./ViewModal";
import TableList from "./TableList";
import GridView from "./GridView";

export interface IAction {
  label: string;
  icon: React.ReactNode;
  onClick: (row: any) => void | Promise<void>;
  variant?: "default" | "destructive";
}

export type FilterCondition = {
  column: string;
  value: string;
  operator:
    | "contains"
    | "equals"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan";
};

export type Column = {
  key: string;
  name: string;
  label?: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "datetime-local"
    | "time"
    | "email"
    | "tel"
    | "url"
    | "password"
    | "select"
    | "textarea"
    | "checkbox"
    | "radio"
    | "color"
    | "file"
    | "range"
    | "month"
    | "week";
  options?: { label: string; value: any }[];
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  validation?: {
    required?: boolean;
    regex?: RegExp;
    pattern?: RegExp;
    message?: string;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | undefined;
  };
  min?: number | string;
  max?: number | string;
  step?: number | string;
  rows?: number;
  accept?: string;
  multiple?: boolean;
  placeholder?: string;
  hideInTable?: boolean;
};

type DisplayTableProps = {
  data: Record<string, any>[];
  columns: Column[];
  actions?: IAction[];
  onEdit?: ((data: any) => Promise<any>) | null;
  onDelete?: ((data: any) => Promise<any>) | null;
  onCreate?: ((data: any) => Promise<any>) | null;
  onView?: ((data: any) => Promise<any>) | null;
  onBulkImport?: ((data: any[]) => Promise<any>) | null;
  exportable?: boolean;
  searchable?: boolean;
  title?: string;
  defaultView?: "table" | "grid";
  filterable?: boolean;
  clientSideProcessing?: boolean;
  totalItems?: number;
  defaultPageSize?: number;
  headerContent?: React.ReactNode;
  gridViewRender?: (data: Record<string, any>[]) => React.ReactNode;
};

export default function DisplayTable({
  data: initialData,
  columns,
  actions = [],
  onEdit,
  onDelete,
  onCreate,
  onView,
  onBulkImport,
  exportable = true,
  searchable = true,
  title = "Data Table",
  defaultView = "table",
  filterable = true,
  clientSideProcessing = true,
  totalItems = 0,
  defaultPageSize = 10,
  gridViewRender,
}: DisplayTableProps) {
  const [search, setSearch] = useQueryState("search");
  const [view, setView] = useQueryState("view", { defaultValue: defaultView });
  const [page, setPage] = useQueryState("page", { defaultValue: "1" });
  const [limit, setLimit] = useQueryState("limit", {
    defaultValue: defaultPageSize.toString(),
  });
  const [sort, setSort] = useQueryState("sort");
  const [direction, setDirection] = useQueryState("direction");
  const [filters, setFilters] = useQueryState("filter", {
    parse: (value) => (value ? value.split(",") : []),
    serialize: (value) => value.join(","),
  });

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const viewMode = view as "table" | "grid";

  const activeFilters: FilterCondition[] = (filters || [])
    .map((f: string) => {
      const [column, operator, value] = f.split(":");
      if (!column || !operator || !value) return undefined;
      return {
        column,
        operator: operator as FilterCondition["operator"],
        value,
      };
    })
    .filter(
      (f: FilterCondition | undefined): f is FilterCondition => f !== undefined,
    );

  const sortConfig = useMemo(
    () =>
      sort
        ? {
            key: sort,
            direction: (direction as "asc" | "desc") || "asc",
          }
        : null,
    [sort, direction],
  );

  const sortedData = useMemo(() => {
    if (!clientSideProcessing) return initialData;

    const sorted = [...initialData];

    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (sortConfig.direction === "asc") {
          return aValue > bValue ? 1 : -1;
        }
        return aValue < bValue ? 1 : -1;
      });
    }

    return sorted;
  }, [initialData, sortConfig, clientSideProcessing]);

  const handleSort = (key: string) => {
    const column = columns.find((col) => col.key === key);
    if (!column?.sortable) return;

    let newDirection: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      newDirection = "desc";
    }

    if (clientSideProcessing) {
      void setSort(key);
      void setDirection(newDirection);
    } else {
      updateUrl({ sort: key, direction: newDirection });
    }
  };

  const addFilter = (
    column: string,
    value: string,
    operator: FilterCondition["operator"],
  ) => {
    const newFilter = `${column}:${operator}:${value}`;
    const newFilters = [...(filters || []), newFilter];

    if (clientSideProcessing) {
      void setFilters(newFilters);
    } else {
      updateUrl({ filter: newFilters.join(",") });
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = [...(filters || [])];
    newFilters.splice(index, 1);

    if (clientSideProcessing) {
      void setFilters(newFilters);
    } else {
      updateUrl({
        filter: newFilters.length > 0 ? newFilters.join(",") : null,
      });
    }
  };

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const handleView = async (row: any) => {
    if (!onView) return;
    try {
      const result = await onView(row);
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      setSelectedRow(row);
      setIsViewModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleDialogClose = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsCreateModalOpen(false);
    setSelectedRow(null);
  };

  const FilterMenu = () => {
    const [selectedColumn, setSelectedColumn] = useState("");
    const [filterValue, setFilterValue] = useState("");
    const [operator, setOperator] =
      useState<FilterCondition["operator"]>("contains");

    const filterableColumns = columns.filter((col) => col.filterable);

    return (
      <Popover open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden lg:inline">Filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Column</Label>
              <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {filterableColumns.map((column) => (
                    <SelectItem key={column.key} value={column.key}>
                      {column.label || column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={operator}
                onValueChange={(value: FilterCondition["operator"]) =>
                  setOperator(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="startsWith">Starts with</SelectItem>
                  <SelectItem value="endsWith">Ends with</SelectItem>
                  <SelectItem value="greaterThan">Greater than</SelectItem>
                  <SelectItem value="lessThan">Less than</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                placeholder="Filter value..."
              />
            </div>

            <Button
              className="w-full"
              disabled={!selectedColumn || !filterValue}
              onClick={() => {
                addFilter(selectedColumn, filterValue, operator);
                setSelectedColumn("");
                setFilterValue("");
                setOperator("contains");
              }}
            >
              Apply Filter
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const exportToCSV = () => {
    const visibleColumns = columns.filter((col) => !col.hidden);
    const headers = visibleColumns
      .map((col) => col.label || col.name)
      .join(",");
    const rows = sortedData.map((row) =>
      visibleColumns.map((col) => JSON.stringify(row[col.key] ?? "")).join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreate = async (data: any) => {
    if (!onCreate) return;
    try {
      await onCreate(data);
      toast.success("Created successfully");
      setIsCreateModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleEdit = async (row: any) => {
    if (!onEdit) return;
    try {
      await onEdit(row);
      toast.success("Updated successfully");
      setIsEditModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleDelete = async (row: any) => {
    if (!onDelete) return;
    try {
      await onDelete(row);
      toast.success("Deleted successfully");
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const [localSearchTerm, setLocalSearchTerm] = useState(search || "");
  const [debouncedSearchTerm] = useDebounce(localSearchTerm, 500);
  const router = useRouter();

  const updateUrl = (newParams: Record<string, string | null>) => {
    if (!clientSideProcessing) {
      const currentUrl = new URL(window.location.href);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          currentUrl.searchParams.delete(key);
        } else {
          currentUrl.searchParams.set(key, value);
        }
      });
      router.push(currentUrl.pathname + currentUrl.search);
    }
  };

  useEffect(() => {
    if (clientSideProcessing) {
      void setSearch(debouncedSearchTerm || null);
    } else {
      updateUrl({ search: debouncedSearchTerm || null });
    }
  }, [debouncedSearchTerm, setSearch, clientSideProcessing]);

  const handleSearch = useCallback((value: string) => {
    setLocalSearchTerm(value);
  }, []);

  const filteredData = useMemo(() => {
    if (!clientSideProcessing) return sortedData;

    return sortedData.filter((row) => {
      if (localSearchTerm) {
        const searchFields = columns
          .filter((col) => !col.hidden)
          .map((col) => row[col.key])
          .join(" ")
          .toLowerCase();

        if (!searchFields.includes(localSearchTerm.toLowerCase())) {
          return false;
        }
      }

      return activeFilters.every((filter) => {
        const value = row[filter.column];
        if (value === undefined || value === null) return false;

        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case "contains":
            return stringValue.includes(filterValue);
          case "equals":
            return stringValue === filterValue;
          case "startsWith":
            return stringValue.startsWith(filterValue);
          case "endsWith":
            return stringValue.endsWith(filterValue);
          case "greaterThan":
            return Number(value) > Number(filterValue);
          case "lessThan":
            return Number(value) < Number(filterValue);
          default:
            return true;
        }
      });
    });
  }, [
    sortedData,
    localSearchTerm,
    activeFilters,
    columns,
    clientSideProcessing,
  ]);

  const currentPage = parseInt(page || "1");
  const pageSize = parseInt(limit || defaultPageSize.toString());
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = (newPage: number) => {
    if (clientSideProcessing) {
      void setPage(newPage.toString());
    } else {
      updateUrl({ page: newPage.toString() });
    }
  };

  const handlePageSizeChange = (size: number) => {
    if (clientSideProcessing) {
      void setLimit(size.toString());
      void setPage("1");
    } else {
      updateUrl({ limit: size.toString(), page: "1" });
    }
  };

  const handleBulkImport = async (data: any[]) => {
    if (!onBulkImport) return;
    try {
      await onBulkImport(data);
      toast.success("Bulk import successful");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  const handleAction = async (action: IAction, row: any) => {
    try {
      await action.onClick(row);
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="flex w-full flex-wrap items-center gap-2 md:justify-between">
        <div>
          {searchable && (
            <div className="relative">
              <div className="block w-[200px]">
                <Input
                  placeholder="Search..."
                  value={localSearchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {filterable && <FilterMenu />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void setView(viewMode === "table" ? "grid" : "table");
            }}
            className="flex items-center gap-2 px-3"
          >
            {viewMode === "table" ? (
              <>
                <TableIcon className="h-5 w-5" />
                <span className="hidden lg:inline">Table View</span>
              </>
            ) : (
              <>
                <LayoutGrid className="h-5 w-5" />
                <span className="hidden lg:inline">Grid View</span>
              </>
            )}
          </Button>
          {onCreate && (
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden lg:inline">New</span>
            </Button>
          )}

          {onBulkImport && (
            <BulkImport
              columns={columns}
              data={[]}
              onImport={handleBulkImport}
            />
          )}

          {exportable && (
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-1"
            >
              <ImportIcon size={20} className="rotate-180" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((filter, index) => {
            const column = columns.find((col) => col.key === filter.column);
            return (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1"
              >
                <span>{column?.label || column?.name}</span>
                <span className="text-xs opacity-70">{filter.operator}</span>
                <span>{filter.value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFilter(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6"
              onClick={() => {
                if (clientSideProcessing) {
                  void setFilters([]);
                } else {
                  updateUrl({ filter: null });
                }
              }}
            >
              Clear all
            </Button>
          )}
        </div>
      )}

      {viewMode === "table" ? (
        <TableList
          columns={columns}
          data={filteredData}
          actions={actions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onSort={handleSort}
          onEditClick={(row) => {
            setSelectedRow(row);
            setIsEditModalOpen(true);
          }}
          onDeleteClick={(row) => {
            setSelectedRow(row);
            setIsDeleteModalOpen(true);
          }}
          handleAction={handleAction}
        />
      ) : (
        <GridView
          data={filteredData}
          columns={columns}
          actions={actions}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          gridViewRender={gridViewRender}
          setSelectedRow={setSelectedRow}
          setIsEditModalOpen={setIsEditModalOpen}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          handleView={handleView}
          handleAction={handleAction}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmation
          isDeleteModalOpen={isDeleteModalOpen}
          handleDialogClose={handleDialogClose}
          selectedRow={selectedRow}
          columns={columns}
          onDelete={handleDelete}
        />
      )}

      {isViewModalOpen && (
        <ViewModal
          isViewModalOpen={isViewModalOpen}
          handleDialogClose={handleDialogClose}
          selectedRow={selectedRow}
          columns={columns}
        />
      )}

      {(isCreateModalOpen || isEditModalOpen) && (
        <AdvancedCrudDialog
          isOpen={true}
          onClose={handleDialogClose}
          onSubmit={async (formData) => {
            if (isCreateModalOpen) {
              await handleCreate(formData);
              handleDialogClose();
            } else if (isEditModalOpen) {
              await handleEdit({
                id: selectedRow?.id,
                ...formData,
              });
              handleDialogClose();
            }
          }}
          onDelete={async () => {
            if (selectedRow) {
              await handleDelete(selectedRow);
              handleDialogClose();
            }
          }}
          title={isCreateModalOpen ? "Create New Record" : "Edit Record"}
          columns={columns}
          initialData={isCreateModalOpen ? {} : selectedRow}
          mode={isCreateModalOpen ? "create" : "edit"}
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
