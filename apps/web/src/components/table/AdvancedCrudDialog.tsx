"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

import type { Column } from "./DisplayTable";

interface AdvancedCrudDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  onDelete: () => Promise<void>;
  title: string;
  columns: Column[];
  initialData: Record<string, any> | undefined;
  mode: "create" | "edit" | "delete";
}

export function AdvancedCrudDialog({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  title,
  columns,
  initialData,
  mode,
}: AdvancedCrudDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>(
    initialData || {},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(initialData || {});
    setErrors({});
  }, [initialData, isOpen]);

  const validateField = (column: Column, value: any): string | undefined => {
    const validation = column.validation;

    if (validation) {
      if (validation.required && (!value || value.toString().trim() === "")) {
        return `${column.name} is required`;
      }

      if (value && validation.regex) {
        if (column.type === "datetime-local") {
          let dateValue = value;
          if (typeof value === "string" && value.includes("/")) {
            const date = new Date(value);
            dateValue = date.toISOString().slice(0, 16);
          }

          if (!validation.regex.test(dateValue)) {
            return validation.message || "Invalid datetime format";
          }
        } else if (!validation.regex.test(value.toString())) {
          return validation.message || "Invalid format";
        }
      }

      if (validation.custom) {
        return validation.custom(value);
      }
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    columns.forEach((column) => {
      if (mode === "edit" && column.hidden) {
        return;
      }
      const error = validateField(column, formData[column.key]);
      if (error) {
        newErrors[column.key] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "delete") {
      try {
        await onDelete();
        onClose();
      } catch (error) {
        toast.error("Failed to delete record");
      }
      return;
    }
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode} record`);
    }
  };

  const renderField = (column: Column) => {
    const commonProps = {
      id: column.key,
      name: column.key,
      value: formData[column.key] || "",
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        setFormData({ ...formData, [column.key]: e.target.value });
        const error = validateField(column, e.target.value);
        setErrors((prev) => ({ ...prev, [column.key]: error || "" }));
      },
      className: `w-full rounded-md border ${errors[column.key] ? "border-red-500" : "border-input"} bg-background px-3 py-2`,
      min: column.min,
      max: column.max,
      step: column.step,
    };

    switch (column.type) {
      case "select":
        return (
          <select {...commonProps}>
            <option value="">Select {column.name}</option>
            {column.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case "textarea":
        return <textarea {...commonProps} rows={column.rows} />;

      default:
        return (
          <Input
            type={column.type}
            {...commonProps}
            accept={column.type === "file" ? column.accept : undefined}
            multiple={column.type === "file" ? column.multiple : undefined}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === "edit" || mode === "create") &&
            columns
              .filter((column) => mode === "create" || !column.hidden)
              .map((column) => (
                <div key={column.key} className="space-y-2">
                  <Label htmlFor={column.key}>
                    {column.label || column.name}
                    {column.validation?.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </Label>
                  {renderField(column)}
                  {errors[column.key] && (
                    <p className="text-sm text-red-500">{errors[column.key]}</p>
                  )}
                </div>
              ))}
          {mode === "delete" && (
            <p>
              Are you sure you want to delete this record? This action cannot be
              undone.
            </p>
          )}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={mode === "delete" ? "destructive" : "default"}
            >
              {mode === "create"
                ? "Create"
                : mode === "edit"
                  ? "Save"
                  : "Confirm Delete"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
