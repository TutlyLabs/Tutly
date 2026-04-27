"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Tabs } from "@tutly/ui/tabs";
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
} from "@tutly/ui/alert-dialog";
import { Button } from "@tutly/ui/button";
import { Textarea } from "@tutly/ui/textarea";
import { api } from "@/trpc/react";
import { useClientSession } from "@/lib/auth/client";

import Messages from "./Messages";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
  doubts: any[];
}

interface MainPageProps {
  allDoubts: Course[];
}

export default function Community({ allDoubts }: MainPageProps) {
  const [currentCourse, setCurrentCourse] = useState<string>(
    allDoubts[0]?.id ?? "",
  );
  const [show, setShow] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const filteredallDoubts = allDoubts.filter((x) => x.id === currentCourse);

  const { data, isPending } = useClientSession();
  const utils = api.useUtils();

  const createDoubt = api.doubts.createDoubt.useMutation({
    onSuccess: () => {
      void utils.doubts.getEnrolledCoursesDoubts.invalidate();
      toast.success("Doubt added successfully");
      setMessage("");
      setShow(false);
    },
    onError: () => {
      toast.error("Failed to add doubt");
    },
  });

  const handleAddDoubt = async (data: { message: string }) => {
    await createDoubt.mutateAsync({
      courseId: currentCourse,
      title: "",
      description: data.message,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      message: message,
    };
    if (!data.message) {
      toast.error("Please enter a message");
      return;
    }
    await handleAddDoubt(data);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setMessage(e.target.value);
  };

  const handleCtrlEnterDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      void handleSubmit(e);
    }
  };

  if (isPending) {
    return <div>Loading...</div>;
  }

  const currentUser = data?.user!;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            Community
          </h1>
          <p className="text-muted-foreground text-sm">
            Ask, answer, and learn together.
          </p>
        </div>
        <AlertDialog open={show} onOpenChange={setShow}>
          <AlertDialogTrigger asChild>
            <Button size="sm">
              {currentUser.role === "STUDENT" ? "Ask a doubt" : "Raise a query"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Share your query</AlertDialogTitle>
              <AlertDialogDescription>
                Be specific — others learn from your phrasing as much as the
                answer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              id="message"
              placeholder="Start typing your doubt here…"
              onChange={handleChange}
              onKeyDown={handleCtrlEnterDown}
              rows={4}
              value={message}
              className="resize-none"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>
                Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="-mx-3 overflow-x-auto sm:mx-0">
        <div className="flex items-center gap-2 px-3 pb-2 sm:px-0">
          {allDoubts?.map(
            (course) =>
              course.isPublished && (
                <button
                  key={course.id}
                  onClick={() => setCurrentCourse(course.id)}
                  className={`inline-flex h-8 shrink-0 cursor-pointer items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors ${
                    currentCourse === course.id
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "bg-card text-foreground/70 hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="max-w-[140px] truncate">{course.title}</span>
                </button>
              ),
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredallDoubts?.[0]?.doubts && (
          <Messages doubts={filteredallDoubts[0].doubts} />
        )}
        {filteredallDoubts[0]?.doubts.length === 0 && (
          <div className="bg-card rounded-xl border p-8 text-center shadow-sm">
            <h2 className="text-foreground text-base font-semibold">
              Start a discussion
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Be the first to share a question in this course.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
