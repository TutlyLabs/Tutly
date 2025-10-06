"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Tabs } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
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
    <div className="flex w-full flex-col gap-4 px-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 overflow-x-auto pb-2 sm:flex-nowrap">
        <div className="flex flex-wrap gap-3 sm:flex-nowrap">
          {allDoubts?.map(
            (course) =>
              course.isPublished && (
                <Tabs
                  onClick={() => setCurrentCourse(course.id)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200 sm:text-base ${
                    currentCourse === course.id
                      ? "border border-blue-700 bg-blue-600 text-white shadow-lg"
                      : "border border-gray-300 bg-white text-gray-800 hover:bg-blue-50 hover:shadow-md"
                  }`}
                  key={course?.id}
                >
                  <h1 className="max-w-[150px] truncate text-sm font-semibold">
                    {course.title}
                  </h1>
                </Tabs>
              ),
          )}
        </div>
        <div className="flex-shrink-0">
          <AlertDialog open={show} onOpenChange={setShow}>
            <AlertDialogTrigger asChild>
              <Button className="rounded-md bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600">
                {currentUser.role === "STUDENT"
                  ? "Ask a Doubt"
                  : "Raise a Query"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Share Your Queries Here</AlertDialogTitle>
                <AlertDialogDescription>
                  <Textarea
                    id="message"
                    placeholder="Start typing your doubt here..."
                    onChange={handleChange}
                    onKeyDown={handleCtrlEnterDown}
                    rows={4}
                    value={message}
                    className="my-2 w-full resize-none rounded-md border border-gray-300 p-3 font-semibold text-gray-300 focus:border-transparent focus:ring-2 focus:ring-fuchsia-500 focus:outline-none"
                  />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {filteredallDoubts?.[0]?.doubts && (
          <Messages doubts={filteredallDoubts[0].doubts} />
        )}
      </div>
      <div>
        {filteredallDoubts[0]?.doubts.length === 0 && (
          <div className="mt-4 px-2 text-center text-base font-semibold sm:text-lg">
            <h1>Be the first to start a discussion and get the prestige!</h1>
          </div>
        )}
      </div>
    </div>
  );
}
