"use client";

import { useState } from "react";
import { ListFilter } from "lucide-react";

import { CalendarSkeleton } from "@/components/loader/Skeletons";
import { Button } from "@tutly/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@tutly/ui/sheet";
import { useIsMobile } from "@tutly/hooks";
import { api } from "@/trpc/react";

import { Calendar } from "./_components/calendar";
import { EventsSidebar } from "./_components/events";

export default function SchedulePage() {
  const q = api.schedule.getScheduleData.useQuery();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (q.isLoading) return <CalendarSkeleton />;
  if (!q.data?.success || !q.data.data) {
    return (
      <div className="text-muted-foreground bg-card flex h-64 items-center justify-center rounded-xl border text-sm">
        Failed to load schedule data.
      </div>
    );
  }
  const { events, isAuthorized, holidays } = q.data.data;

  if (isMobile) {
    return (
      <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-foreground text-lg font-semibold">Schedule</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ListFilter className="h-4 w-4" />
                Events
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            >
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="text-base">Events</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <EventsSidebar events={events} fullWidth />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="bg-card min-h-0 flex-1 overflow-hidden rounded-xl border shadow-sm">
          <Calendar
            events={events}
            isAuthorized={isAuthorized}
            holidays={holidays}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-7xl gap-4">
      <div className="w-[280px] shrink-0">
        <EventsSidebar events={events} />
      </div>
      <div className="bg-card min-w-0 flex-1 overflow-hidden rounded-xl border shadow-sm">
        <Calendar
          events={events}
          isAuthorized={isAuthorized}
          holidays={holidays}
        />
      </div>
    </div>
  );
}
