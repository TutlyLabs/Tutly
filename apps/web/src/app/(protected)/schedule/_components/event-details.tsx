"use client";

import { HiChevronDoubleLeft } from "react-icons/hi";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Event {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  link: string;
  type: string;
}

interface EventDetailsProps {
  event: Event;
  onClose: () => void;
}

export function EventDetails({ event, onClose }: EventDetailsProps) {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold">
            {event.name}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          <div className="space-y-4">
            <p className="text-sm font-semibold">{event.description}</p>
          </div>
        </AlertDialogDescription>
        <AlertDialogFooter>
          {event.type !== "Holiday" && (
            <AlertDialogAction>
              <a href={event.link} className="hover:underline">
                View
              </a>
            </AlertDialogAction>
          )}
          <AlertDialogCancel onClick={onClose}>
            <HiChevronDoubleLeft /> Back
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
