"use client";

import { useState } from "react";
import { FaUsersGear } from "react-icons/fa6";
import { IoMdBookmarks } from "react-icons/io";
import { MdOutlineEdit } from "react-icons/md";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import CourseFormModal from "./CourseFormModal";
import Image from "next/image";

export default function CourseCard({ course, currentUser }: any) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);

  const expired = () => {
    if (!course.endDate) return false;
    const endDate = new Date(course.endDate as string);
    const currentDate = new Date();
    return currentDate > endDate;
  };

  return (
    <Card className="m-auto mt-3 w-[280px] overflow-hidden md:mx-2">
      <div
        className="text-secondary-700 relative h-[150px] cursor-pointer bg-white"
        onClick={
          expired()
            ? () => router.push("/courses")
            : () => router.push(`/courses/${course.id}`)
        }
      >
        <div className="relative h-full w-full">
          <Image
            src={course.image || "/new-course-placeholder.jpg"}
            alt={course.title}
            className="h-full w-full object-cover"
            width={280}
            height={150}
          />
          {!course.isPublished && currentUser?.role === "INSTRUCTOR" && (
            <div className="absolute top-0 right-0 m-3 rounded-md border bg-red-500 px-2 py-1 text-xs text-white">
              Draft
            </div>
          )}
          <div className="absolute right-0 bottom-0 m-3 flex items-center rounded-md border bg-blue-500 px-2 py-1 text-xs text-white">
            <IoMdBookmarks className="mr-1" />
            <span>{course._count.classes} Classes</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t p-3">
        <div className="min-w-0 flex-1 cursor-pointer">
          <h2
            className="truncate font-medium"
            title={expired() ? `${course.title} [Expired]` : course.title}
          >
            {expired() ? `${course.title} [Expired]` : course.title}
          </h2>
        </div>

        {currentUser.role === "INSTRUCTOR" && !currentUser.isAdmin && (
          <div className="flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/courses/${course.id}/manage`)}
            >
              <FaUsersGear className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpenModal(true)}
            >
              <MdOutlineEdit className="h-5 w-5" />
            </Button>

            <CourseFormModal
              open={openModal}
              onOpenChange={setOpenModal}
              mode="edit"
              defaultValues={{
                id: course.id,
                title: course.title,
                isPublished: course.isPublished,
                image: course.image,
              }}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
