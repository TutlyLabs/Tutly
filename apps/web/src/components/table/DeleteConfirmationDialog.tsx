import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Column } from "./DisplayTable";
import { toast } from "sonner";

interface DeleteConfirmationProps {
  isDeleteModalOpen: boolean;
  handleDialogClose: () => void;
  selectedRow: Record<string, any> | null;
  columns: Column[];
  onDelete: (row: Record<string, any>) => Promise<void>;
}

export const DeleteConfirmation = ({
  isDeleteModalOpen,
  handleDialogClose,
  selectedRow,
  columns,
  onDelete,
}: DeleteConfirmationProps) => (
  <Dialog open={isDeleteModalOpen} onOpenChange={handleDialogClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Record</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p>Are you sure you want to delete this record?</p>
        <div className="bg-muted space-y-2 rounded-md border p-4">
          <div className="font-medium">Record ID: {selectedRow?.id}</div>
          {columns
            .filter((col) => !col.hidden)
            .slice(0, 3)
            .map((col) => (
              <div key={col.key} className="text-sm">
                <span className="font-medium">{col.label || col.name}:</span>{" "}
                {col.type === "date"
                  ? new Date(selectedRow?.[col.key]).toLocaleDateString()
                  : col.render
                    ? col.render(selectedRow?.[col.key], selectedRow)
                    : selectedRow?.[col.key]}
              </div>
            ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (selectedRow) {
                try {
                  await onDelete(selectedRow);
                  handleDialogClose();
                } catch (error) {
                  toast.error("Failed to delete record");
                }
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);
