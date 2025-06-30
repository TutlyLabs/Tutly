import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";
import type { Column } from "./DisplayTable";

interface ViewModalProps {
  isViewModalOpen: boolean;
  handleDialogClose: () => void;
  selectedRow: Record<string, any> | null;
  columns: Column[];
}

const ViewModal = ({
  isViewModalOpen,
  handleDialogClose,
  selectedRow,
  columns,
}: ViewModalProps) => (
  <Dialog open={isViewModalOpen} onOpenChange={handleDialogClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>View Record</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {columns
          .filter((col) => !col.hidden)
          .map((col) => (
            <div key={col.key} className="group relative space-y-2">
              <div>
                <Label>{col.label || col.name}</Label>
                <div className="relative">
                  <div className="bg-muted rounded-md border p-2">
                    {selectedRow?.[col.key]}
                  </div>
                  <Button
                    className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        selectedRow?.[col.key],
                      );
                      toast.success(
                        `${col.label || col.name} copied successfully`,
                      );
                    }}
                  >
                    <CopyIcon className="text-muted-foreground hover:text-foreground h-4 w-4 transition-colors" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        <div className="flex justify-end">
          <Button onClick={handleDialogClose}>Close</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default ViewModal;
