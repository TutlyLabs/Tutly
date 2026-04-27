"use client";

import { useState } from "react";
import { FaUsersGear } from "react-icons/fa6";
import { IoMdBookmarks } from "react-icons/io";
import { MdOutlineEdit } from "react-icons/md";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@tutly/ui/button";
import { Card } from "@tutly/ui/card";

import CourseFormModal from "./CourseFormModal";

export default function CourseCard({ course, currentUser }: any) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState(false);

  const isExpired = (() => {
    if (!course.endDate) return false;
    const endDate = new Date(course.endDate as string);
    const currentDate = new Date();
    return currentDate > endDate;
  })();

  const goToCourse = () =>
    isExpired
      ? router.push("/courses")
      : router.push(`/courses/detail?id=${course.id}`);

  const isInstructor =
    currentUser.role === "INSTRUCTOR" && !currentUser.isAdmin;

  return (
    <Card className="bg-card group flex h-full flex-col overflow-hidden rounded-xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={goToCourse}
        className="relative aspect-[16/9] w-full cursor-pointer overflow-hidden bg-white text-left"
        aria-label={`Open ${course.title}`}
      >
        <Image
          src={course.image || "/new-course-placeholder.jpg"}
          alt={course.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {!course.isPublished && currentUser?.role === "INSTRUCTOR" && (
          <span className="absolute top-2 left-2 rounded-md bg-red-500/90 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur">
            Draft
          </span>
        )}
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur">
          <IoMdBookmarks className="h-3 w-3" />
          {course._count.classes} classes
        </span>
        {isExpired && (
          <span className="absolute top-2 right-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur">
            Expired
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <button
          type="button"
          onClick={goToCourse}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <h2 className="text-foreground truncate text-sm font-semibold">
            {course.title}
          </h2>
          <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
            {course._count.classes} classes
          </p>
        </button>

        {isInstructor && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Manage students"
              onClick={() => router.push(`/courses/manage?id=${course.id}`)}
            >
              <FaUsersGear className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Edit course"
              onClick={() => setOpenModal(true)}
            >
              <MdOutlineEdit className="h-4 w-4" />
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
