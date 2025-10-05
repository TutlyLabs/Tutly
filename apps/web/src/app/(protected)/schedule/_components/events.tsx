"use client";

import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CiStreamOn } from "react-icons/ci";
import { MdEventRepeat } from "react-icons/md";
import { PiTagChevronBold } from "react-icons/pi";

import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

import { EventDetails } from "./event-details";

dayjs.extend(isBetween);

export const EventsSidebar = ({ events }: { events: any[] }) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Debug logging
  console.log("EventsSidebar received events:", events);
  console.log("Events type:", typeof events);
  console.log("Events length:", events?.length);

  const getStatusBadge = (startDate: string, endDate: string, type: string) => {
    const now = dayjs();
    const start = dayjs(startDate);
    const end = dayjs(endDate);

    if (type === "Holiday" || type === "Assignment") {
      return (
        <span className="ml-auto rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700">
          {type}
        </span>
      );
    }
    if (now.isBetween(start, end, null, "[]")) {
      return (
        <span className="ml-auto flex justify-center gap-1 rounded-full bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-500">
          <CiStreamOn className="text-base font-bold" /> Live
        </span>
      );
    }
    if (end.isBefore(now)) {
      return (
        <span className="ml-auto rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-500">
          Completed
        </span>
      );
    } else {
      return (
        <span className="ml-auto rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
          Upcoming
        </span>
      );
    }
  };

  const renderEventItem = (event: any) => (
    <div
      key={event.id}
      className="mb-2 flex cursor-pointer items-center gap-3 rounded-md bg-gray-100 p-3 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-800"
      onClick={() => setSelectedEvent(event)}
    >
      <PiTagChevronBold className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      <div>
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {event.name}
        </h1>
      </div>
      {getStatusBadge(event.startDate, event.endDate, event.type)}
    </div>
  );

  const renderAssignmentItem = (assignment: any) => (
    <div
      key={assignment.id}
      className="mb-2 flex cursor-pointer items-center gap-3 rounded-md bg-gray-100 p-3 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-gray-800"
      onClick={() => setSelectedEvent(assignment)}
    >
      <div>
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {assignment.name}
        </h1>
      </div>
      {getStatusBadge(
        assignment.startDate,
        assignment.endDate,
        assignment.type,
      )}
    </div>
  );

  const now = dayjs();
  const assignments = events?.filter((event) => event.type === "Assignment");
  const otherEvents = events?.filter((event) => event.type !== "Assignment");

  // live events
  const liveEvents = otherEvents?.filter((event) =>
    now.isBetween(dayjs(event.startDate), dayjs(event.endDate), null, "[]"),
  );

  // upcoming events
  const upcomingEvents = otherEvents?.filter((event) =>
    dayjs(event.startDate).isAfter(now),
  );

  // completed events
  const completedEvents = otherEvents?.filter((event) =>
    dayjs(event.endDate).isBefore(now),
  );

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center gap-2 py-4">
      <MdEventRepeat className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/50" />
      <span className="text-xs text-muted-foreground text-center">{message}</span>
    </div>
  );

  const renderEventSection = (
    title: string,
    eventList: any[],
    emptyMessage: string,
    defaultOpen = false,
  ) => (
    <Collapsible defaultOpen={defaultOpen} className="space-y-1">
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2 text-left">
        <h2 className="text-foreground text-base font-bold">{title}</h2>
        <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {eventList.length === 0
          ? renderEmptyState(emptyMessage)
          : eventList.map(renderEventItem)}
      </CollapsibleContent>
    </Collapsible>
  );

  const renderAssignmentSection = (assignments: any[], defaultOpen = false) => (
    <Collapsible defaultOpen={defaultOpen} className="space-y-1">
      <CollapsibleTrigger className="hover:bg-accent flex w-full items-center justify-between rounded-md p-2 text-left">
        <h2 className="text-foreground text-base font-bold">Assignments</h2>
        <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {assignments.length === 0
          ? renderEmptyState("No assignments available")
          : assignments.map(renderAssignmentItem)}
      </CollapsibleContent>
    </Collapsible>
  );

  // Determine if we have content for the sidebar
  const hasEvents =
    liveEvents.length > 0 ||
    upcomingEvents.length > 0 ||
    completedEvents.length > 0 ||
    assignments.length > 0;

  return (
    <div className="w-[260px]">
      <Card className="bg-background h-full rounded-lg p-3 shadow-md">
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <div className="space-y-2 pb-1">
            {renderEventSection(
              "Live Events",
              liveEvents,
              "No live events",
              true,
            )}
            {renderEventSection(
              "Upcoming Events",
              upcomingEvents,
              "No upcoming events",
              true,
            )}
            {renderAssignmentSection(assignments, false)}
            {renderEventSection(
              "Completed Events",
              completedEvents,
              "No completed events",
              false,
            )}

            {!hasEvents && (
              <div className="text-muted-foreground flex flex-col items-center justify-center py-4">
                <MdEventRepeat className="text-muted-foreground/50 h-8 w-8" />
                <p className="mt-2 text-center text-sm">No events scheduled</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};
