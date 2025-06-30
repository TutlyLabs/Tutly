"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { MdHolidayVillage } from "react-icons/md";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";
import AddHolidayDialog from "@/app/(protected)/dashboard/_components/Holidays";

import { DayView } from "./day-view";
import { EventDetails } from "./event-details";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { YearView } from "./year-view";

type ViewType = "day" | "week" | "month" | "year";

interface Event {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  link: string;
  type: string;
}

interface CalendarProps {
  events: any;
  holidays?: any[];
  isAuthorized?: boolean;
}

export const Calendar = ({
  events,
  holidays,
  isAuthorized = false,
}: CalendarProps) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedView, setSelectedView] = useState<"calendar" | "holidays">(
    "calendar",
  );
  const [editingHoliday, setEditingHoliday] = useState<any>(null);

  const { mutate: deleteHoliday } = api.holidays.deleteHoliday.useMutation({
    onSuccess: () => {
      toast.success("Holiday deleted successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete holiday");
    },
  });

  const { mutate: editHolidays } = api.holidays.editHolidays.useMutation({
    onSuccess: () => {
      toast.success("Holiday updated successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update holiday");
    },
  });

  const navigateToday = () => setSelectedDate(new Date());

  const navigate = (direction: "prev" | "next") => {
    if (view === "day") {
      setSelectedDate(
        direction === "prev"
          ? subDays(selectedDate, 1)
          : addDays(selectedDate, 1),
      );
    } else if (view === "week") {
      setSelectedDate(
        direction === "prev"
          ? subWeeks(selectedDate, 1)
          : addWeeks(selectedDate, 1),
      );
    } else if (view === "month") {
      setSelectedDate(
        direction === "prev"
          ? subMonths(selectedDate, 1)
          : addMonths(selectedDate, 1),
      );
    } else if (view === "year") {
      setSelectedDate(
        direction === "prev"
          ? subYears(selectedDate, 1)
          : addYears(selectedDate, 1),
      );
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleDelete = async (id: string) => {
    try {
      deleteHoliday({ id });
    } catch (error) {
      console.error("Error deleting holiday", error);
    }
  };

  const handleEditSubmit = async (holidayData: any) => {
    try {
      const { id, reason, description, startDate, endDate } = holidayData;
      editHolidays({
        id,
        reason,
        description,
        startDate: startDate.toString(),
        endDate: endDate.toString(),
      });
    } catch (error) {
      console.error("Error editing holiday", error);
    }
  };

  const openEditDialog = (holiday: any) => {
    setEditingHoliday({
      id: holiday.id,
      reason: holiday.reason,
      description: holiday.description,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
    });
  };

  return (
    <div className="flex flex-col">
      <header className="flex flex-col items-center justify-between gap-5 border-b p-2 md:flex-row">
        <div className="flex items-center space-x-4">
          {isAuthorized && (
            <Tabs
              value={selectedView}
              onValueChange={(value) =>
                setSelectedView(value as "calendar" | "holidays")
              }
            >
              <TabsList>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="holidays">Holidays</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {selectedView === "calendar" && (
            <Tabs
              value={view}
              onValueChange={(value) => setView(value as ViewType)}
            >
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        {selectedView === "calendar" ? (
          <div className="flex items-center space-x-4">
            <span className="text-lg font-semibold">
              {format(selectedDate, "dd MMMM yyyy")}
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={navigateToday}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <AddHolidayDialog />
          </div>
        )}
      </header>

      {selectedView === "calendar" ? (
        <>
          <main className="h-[90vh] flex-1">
            {view === "day" && (
              <DayView
                selectedDate={selectedDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
            {view === "week" && (
              <WeekView
                selectedDate={selectedDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
            {view === "month" && (
              <MonthView
                selectedDate={selectedDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
            {view === "year" && (
              <YearView
                selectedDate={selectedDate}
                events={events}
                onEventClick={handleEventClick}
              />
            )}
          </main>

          {selectedEvent && (
            <EventDetails
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
            />
          )}
        </>
      ) : (
        <div className="bg-background mt-4 overflow-x-auto rounded-lg p-6 shadow-md">
          <div className="flex justify-between">
            <h2 className="mb-6 text-xl font-bold">List of Holidays</h2>
          </div>
          {holidays && holidays.length > 0 ? (
            <ScrollArea className="max-h-[80vh] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Reason</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">From</TableHead>
                    <TableHead className="font-semibold">To</TableHead>
                    {isAuthorized && (
                      <TableHead className="font-semibold">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday: any) => (
                    <TableRow key={holiday.id}>
                      <TableCell>{holiday.reason}</TableCell>
                      <TableCell>
                        {holiday.description || "No description available"}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(holiday.startDate),
                          "MMMM d, yyyy, EEEE",
                        )}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(holiday.endDate),
                          "MMMM d, yyyy, EEEE",
                        )}
                      </TableCell>
                      {isAuthorized && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(holiday)}
                                >
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Holiday</DialogTitle>
                                  <DialogDescription>
                                    Make changes to the holiday details here.
                                    Click save when you&apos;re done.
                                  </DialogDescription>
                                </DialogHeader>
                                <form
                                  onSubmit={async (e) => {
                                    e.preventDefault();
                                    await handleEditSubmit(editingHoliday);
                                  }}
                                >
                                  <ScrollArea className="h-full overflow-auto">
                                    <div className="p-3">
                                      <label htmlFor="reason">Reason</label>
                                      <Input
                                        id="reason"
                                        className="mt-2"
                                        value={editingHoliday?.reason || ""}
                                        onChange={(e) =>
                                          setEditingHoliday({
                                            ...editingHoliday,
                                            reason: e.target.value,
                                          })
                                        }
                                        required
                                      />
                                    </div>
                                    <div className="p-3">
                                      <label htmlFor="description">
                                        Description
                                      </label>
                                      <Textarea
                                        id="description"
                                        className="mt-2"
                                        value={
                                          editingHoliday?.description || ""
                                        }
                                        onChange={(e) =>
                                          setEditingHoliday({
                                            ...editingHoliday,
                                            description: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="p-3">
                                      <label htmlFor="startDate">
                                        Start Date
                                      </label>
                                      <CalendarPicker
                                        id="startDate"
                                        mode="single"
                                        selected={
                                          new Date(editingHoliday?.startDate)
                                        }
                                        onSelect={(date) =>
                                          setEditingHoliday({
                                            ...editingHoliday,
                                            startDate: date?.toISOString(),
                                          })
                                        }
                                        className="mt-2"
                                      />
                                    </div>
                                    <div className="p-3">
                                      <label htmlFor="endDate">End Date</label>
                                      <CalendarPicker
                                        id="endDate"
                                        mode="single"
                                        selected={
                                          new Date(editingHoliday?.endDate)
                                        }
                                        onSelect={(date) =>
                                          setEditingHoliday({
                                            ...editingHoliday,
                                            endDate: date?.toISOString(),
                                          })
                                        }
                                        className="mt-2"
                                      />
                                    </div>
                                  </ScrollArea>
                                  <DialogFooter>
                                    <Button type="submit" className="mt-4">
                                      Save changes
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you absolutely sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the holiday.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(holiday.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg p-8">
              <MdHolidayVillage className="text-muted-foreground mb-4 h-16 w-16 md:h-24 md:w-24" />
              <h1 className="text-base font-semibold">No holidays scheduled</h1>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
