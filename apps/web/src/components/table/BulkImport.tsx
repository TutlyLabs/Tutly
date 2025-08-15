import { ImportIcon, Info, Plus, Trash2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { Column } from "./DisplayTable";

type BulkImportProps = {
  columns: Column[];
  data: Record<string, any>[];
  onImport: (data: Record<string, any>[]) => void;
};

type Row = Record<string, any>;

export default function BulkImport({
  columns,
  data,
  onImport,
}: BulkImportProps) {
  const [gridData, setGridData] = useState<Row[]>([]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setGridData(data.length > 0 ? data : [{}]);
  }, [data]);

  useEffect(() => {
    if (isOpen) {
      setGridData(data.length > 0 ? data : [{}]);
      setErrors({});
    }
  }, [isOpen, data]);

  const validateRow = useCallback(
    (row: Row, rowIndex: number) => {
      const newErrors: Record<string, string[]> = {};

      columns.forEach((col) => {
        const value = row[col.key];
        const validation = col.validation;

        if (validation) {
          if (
            validation.required &&
            (!value || value.toString().trim() === "")
          ) {
            newErrors[`${rowIndex}-${col.key}`] = [`${col.name} is required`];
          } else if (value && validation.regex) {
            if (col.type === "datetime-local") {
              let dateValue = value;
              if (typeof value === "string" && value.includes("/")) {
                const date = new Date(value);
                dateValue = date.toISOString().slice(0, 16);
              }

              if (!validation.regex.test(dateValue)) {
                newErrors[`${rowIndex}-${col.key}`] = [
                  validation.message || "Invalid datetime format",
                ];
              }
            } else if (!validation.regex.test(value.toString())) {
              newErrors[`${rowIndex}-${col.key}`] = [
                validation.message || "Invalid format",
              ];
            }
          }
        }
      });

      return newErrors;
    },
    [columns],
  );

  const validateAllRows = useCallback(
    (rows: Row[]) => {
      const allErrors: Record<string, string[]> = {};
      rows.forEach((row, index) => {
        const rowErrors = validateRow(row, index);
        Object.assign(allErrors, rowErrors);
      });
      return allErrors;
    },
    [validateRow],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();

      const targetCell = (event.target as HTMLElement).closest("td");
      if (!targetCell) return;

      const columnIndex = Array.from(
        targetCell.parentElement?.children || [],
      ).indexOf(targetCell);
      const rowIndex = Array.from(
        targetCell.parentElement?.parentElement?.children || [],
      ).indexOf(targetCell.parentElement!);

      const pastedData = event.clipboardData
        .getData("text")
        .split("\n")
        .filter((line) => line.trim())
        .map((row) => row.split("\t"));

      setGridData((prevData) => {
        const newData = [...prevData];

        pastedData.forEach((row, index) => {
          const currentRowIndex = rowIndex + index;
          if (!newData[currentRowIndex]) {
            newData[currentRowIndex] = {};
          }

          row.forEach((value, colOffset) => {
            const targetColIndex = columnIndex + colOffset;
            if (targetColIndex < columns.length) {
              const column = columns[targetColIndex];
              if (column) {
                let processedValue = value.trim();

                if (column.type === "datetime-local" && processedValue) {
                  try {
                    const date = new Date(processedValue);
                    if (!isNaN(date.getTime())) {
                      processedValue = date.toISOString().slice(0, 16);
                    }
                  } catch (error) {
                    console.error("Date parsing error:", error);
                  }
                }

                if (column.type === "select" && column.options) {
                  const option = column.options.find(
                    (opt) =>
                      opt.value.toString().toLowerCase() ===
                        processedValue.toLowerCase() ||
                      opt.label.toLowerCase() === processedValue.toLowerCase(),
                  );
                  processedValue = option ? option.value : processedValue;
                }
                if (newData[currentRowIndex]) {
                  newData[currentRowIndex][column.key] = processedValue;
                }
              }
            }
          });
        });

        return newData;
      });

      setGridData((currentData) => {
        const newErrors = validateAllRows(currentData);
        setErrors(newErrors);
        return currentData;
      });
    },
    [columns, validateAllRows],
  );

  const renderInput = (column: Column, value: any, rowIndex: number) => {
    const commonProps = {
      value: value ?? "",
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >,
      ) => handleCellChange(rowIndex, column.key, e.target.value),
      className: `w-full outline-none bg-transparent ${
        errors[`${rowIndex}-${column.key}`] ? "border-red-500" : ""
      }`,
      placeholder: column.placeholder,
      min: column.min,
      max: column.max,
      step: column.step,
    };

    switch (column.type) {
      case "select":
        return (
          <Select
            value={value?.toString() || ""}
            onValueChange={(newValue) =>
              handleCellChange(rowIndex, column.key, newValue)
            }
          >
            <SelectTrigger className="w-full border-none shadow-none">
              <SelectValue placeholder={`Select ${column.name}`} />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "textarea":
        return <textarea {...commonProps} rows={column.rows || 3} />;

      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) =>
              handleCellChange(rowIndex, column.key, e.target.value)
            }
            className="m-2 h-4 w-4"
          />
        );

      case "radio":
        return (
          <div className="flex gap-2">
            {column.options?.map((option) => (
              <label key={option.value} className="flex items-center gap-1">
                <input
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) =>
                    handleCellChange(rowIndex, column.key, e.target.value)
                  }
                  className="h-4 w-4"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={column.type || "text"}
            {...commonProps}
            accept={column.type === "file" ? column.accept : undefined}
            multiple={column.type === "file" ? column.multiple : undefined}
          />
        );
    }
  };

  const handleAddRow = () => {
    setGridData((prev) => [...prev, {}]);
  };

  const handleCellChange = (
    rowIndex: number,
    columnKey: string,
    value: string,
  ) => {
    setGridData((prevData) => {
      const newData = [...prevData];
      if (!newData[rowIndex]) {
        newData[rowIndex] = {};
      }
      newData[rowIndex] = {
        ...newData[rowIndex],
        [columnKey]: value,
      };

      const newErrors = validateAllRows(newData);
      setErrors(newErrors);

      return newData;
    });
  };

  const handleImport = () => {
    const validationErrors = validateAllRows(gridData);
    setErrors(validationErrors);

    try {
      if (Object.keys(validationErrors).length === 0) {
        const validData = gridData.filter((row) =>
          Object.values(row).some(
            (value) => value !== undefined && value !== "",
          ),
        );
        console.log("Imported data:", validData);
        onImport(validData);
        setIsOpen(false);
        setGridData([{}]);
      }
    } catch (error) {
      toast.error("Error importing data");
    }
  };

  const getValidationRules = (col: Column): string => {
    const rules: string[] = [];

    if (col.validation?.required) {
      rules.push("Required");
    }

    if (col.type === "select" || col.type === "radio") {
      const options = col.options?.map((opt) => opt.label).join(", ");
      rules.push(`Must be one of: ${options}`);
    }

    if (col.validation?.minLength) {
      rules.push(`Minimum length: ${col.validation.minLength}`);
    }

    if (col.validation?.maxLength) {
      rules.push(`Maximum length: ${col.validation.maxLength}`);
    }

    if (col.min !== undefined) {
      rules.push(`Minimum value: ${col.min}`);
    }

    if (col.max !== undefined) {
      rules.push(`Maximum value: ${col.max}`);
    }

    if (col.validation?.regex) {
      rules.push(col.validation.message || "Must match required format");
    }

    if (col.type === "file" && col.accept) {
      rules.push(`Accepted file types: ${col.accept}`);
    }

    return rules.join("\n") || "No validation rules";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-1">
          <ImportIcon size={16} className="inline" />
          <span className="hidden lg:ml-auto lg:inline lg:w-[80px]">
            Bulk Import
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[90vh] max-w-[90vw] flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Bulk Import Data</DialogTitle>
          <DialogDescription>
            Supports Copy/Paste from Excel, CSV, and other spreadsheet formats.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4" onPaste={handlePaste}>
          <div className="min-h-[300px]">
            <table className="w-full border-collapse border-gray-100">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className="border bg-gray-50 p-2">
                      <div className="flex items-center gap-1 dark:text-gray-950">
                        {col.name}
                        {col.validation?.required && (
                          <span className="text-red-500">*</span>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info
                                size={14}
                                className="cursor-help text-gray-400 hover:text-gray-600"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <pre className="text-sm whitespace-pre-wrap">
                                {getValidationRules(col)}
                              </pre>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </th>
                  ))}
                  <th className="w-16 border bg-gray-50 p-2 dark:text-gray-950">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {gridData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {columns.map((col) => (
                      <td
                        key={`${rowIndex}-${col.key}`}
                        className={`relative border p-2 dark:border-gray-100 ${
                          errors[`${rowIndex}-${col.key}`] ? "bg-red-50" : ""
                        }`}
                      >
                        <div className="min-h-[40px]">
                          {renderInput(col, row[col.key], rowIndex)}
                          {errors[`${rowIndex}-${col.key}`] && (
                            <div className="mt-1 text-xs text-red-700">
                              {errors[`${rowIndex}-${col.key}`]?.[0]}
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="w-16 border p-2 dark:border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100"
                        onClick={() => {
                          setGridData((prevData) => {
                            const newData = [...prevData];
                            newData.splice(rowIndex, 1);
                            if (newData.length === 0) newData.push({});
                            return newData;
                          });
                          setErrors((prevErrors) => {
                            const newErrors: Record<string, string[]> = {};
                            Object.entries(prevErrors).forEach(
                              ([key, value]) => {
                                const [errRowIndex, colKey] = key.split("-");
                                if (errRowIndex) {
                                  const errRow = parseInt(errRowIndex);
                                  if (errRow < rowIndex) {
                                    newErrors[key] = value;
                                  } else if (errRow > rowIndex) {
                                    newErrors[`${errRow - 1}-${colKey}`] =
                                      value;
                                  }
                                }
                              },
                            );
                            return newErrors;
                          });
                        }}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border-t bg-gray-50 p-6 dark:bg-gray-500">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            className="flex items-center gap-1"
          >
            <Plus size={16} /> Add Row
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={Object.keys(errors).length > 0}
            >
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
