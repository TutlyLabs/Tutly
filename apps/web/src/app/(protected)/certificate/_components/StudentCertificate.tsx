"use client";

import html2canvas from "html2canvas";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { IoMdDownload } from "react-icons/io";

import { saveDataUrl } from "@/lib/native-files";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
} from "@tutly/ui/alert-dialog";
import { Button } from "@tutly/ui/button";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";

interface Course {
  courseId: string;
  courseTitle: string;
  assignmentsSubmitted: number;
  totalPoints: number;
  totalAssignments: number;
}

interface User {
  name: string;
  username: string;
}

interface DashboardData {
  courses: Course[];
  currentUser: User;
}

export default function StudentCertificate({
  user,
  data,
}: {
  user: User;
  data: DashboardData;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCourse, setActiveCourse] = useState(
    data.courses[0]?.courseId || "",
  );

  const downloadCertificate = async (courseTitle: string) => {
    const certificateElement = document.getElementById(
      `certificate-${courseTitle}`,
    );
    if (!certificateElement) return;

    setIsLoading(true);
    try {
      const canvas = await html2canvas(certificateElement);
      const imgData = canvas.toDataURL("image/png");
      await saveDataUrl(imgData, `${user.name}_${courseTitle}_Certificate.png`);
    } catch (error) {
      console.error("Failed to generate certificate:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCertificate = (course: Course) => {
    if (
      course.assignmentsSubmitted !== course.totalAssignments ||
      course.totalAssignments <= 0
    ) {
      return (
        <div className="bg-amber-500/10 border-amber-500/30 mx-auto max-w-3xl rounded-xl border p-5 text-center">
          <p className="text-foreground text-base font-semibold">
            Almost there 🎯
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Complete all assignments to unlock the {course.courseTitle}{" "}
            certificate.
          </p>
          <p className="text-foreground mt-3 text-xs font-medium tabular-nums">
            {course.assignmentsSubmitted} / {course.totalAssignments}{" "}
            assignments completed
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="w-full">
        <div className="mx-auto w-[800px]">
          <div
            id={`certificate-${course.courseTitle}`}
            className="relative h-[566px] w-[800px]"
          >
            <Image
              src="/gold_template.png"
              alt="Certificate"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-[40%] left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 transform text-center text-3xl font-bold text-black uppercase">
              {user.name}
            </div>
            <div className="absolute top-[55%] left-1/2 w-[75%] -translate-x-1/2 -translate-y-1/2 transform text-center text-lg leading-relaxed font-medium text-[#333]">
              This certificate is awarded to{" "}
              <span className="font-bold">{user.name}</span> for successfully
              completing the{" "}
              <span className="font-bold">{course.courseTitle}</span> Course. We
              recognize their dedication and hard work in acquiring the skills
              necessary for this course.
            </div>
            <div className="absolute top-[70%] left-16 flex flex-col items-center">
              <Image
                src="/signature.png"
                alt="Signature"
                width={160}
                height={80}
                className="h-auto w-40"
              />
              <p className="text-sm font-bold text-gray-600">Rajesh Thappeta</p>
              <p className="text-xs text-gray-600">Course Instructor</p>
            </div>
            <div className="absolute top-[88%] left-1/2 -translate-x-1/2 transform text-center text-sm font-semibold text-[#555]">
              Presented by <span className="text-blue-900">Tutly</span>
            </div>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div>
        <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          Certificates
        </h1>
        <p className="text-muted-foreground text-sm">
          Download your completion certificates.
        </p>
      </div>

      <AlertDialog open={isLoading}>
        <AlertDialogContent className="flex items-center justify-center">
          <AlertDialogDescription className="text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            Download in progress...
          </AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs value={activeCourse} onValueChange={setActiveCourse} className="space-y-3">
        <ScrollArea className="-mx-3 sm:mx-0">
          <TabsList className="bg-muted/40 mx-3 inline-flex h-9 w-max items-center gap-1 rounded-lg p-1 sm:mx-0">
            {data.courses.map((course: Course) => (
              <TabsTrigger
                key={course.courseId}
                value={course.courseId}
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 rounded-md px-3 text-xs font-medium whitespace-nowrap data-[state=active]:shadow-sm"
              >
                {course.courseTitle}
              </TabsTrigger>
            ))}
          </TabsList>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        {data.courses.map((course: Course) => (
          <TabsContent
            key={course.courseId}
            value={course.courseId}
            className="m-0 space-y-3"
          >
            {course.assignmentsSubmitted === course.totalAssignments && (
              <div className="flex justify-end">
                <Button
                  onClick={() => void downloadCertificate(course.courseTitle)}
                  className="gap-2"
                  size="sm"
                >
                  <IoMdDownload className="h-4 w-4" />
                  Download Certificate
                </Button>
              </div>
            )}
            <div>{renderCertificate(course)}</div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
