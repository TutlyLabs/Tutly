"use client";

import { useEffect, useState } from "react";
import { FaSearch } from "react-icons/fa";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Course, User } from "@prisma/client";

import NoDataFound from "@/components/NoDataFound";
import { Input } from "@/components/ui/input";

type StudentWithRelations = User & {
  course: Course[];
  enrolledUsers: {
    courseId: string;
    mentorUsername: string;
  }[];
};

type CourseWithRelations = Course & {
  classes: {
    id: string;
    createdAt: Date;
  }[];
  createdBy: {
    id: string;
    username: string;
    name: string;
    image: string | null;
    email: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  _count: {
    classes: number;
  };
  courseAdmins: {
    id: string;
    username: string;
    name: string;
    image: string | null;
    email: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
};

const MentorAssignmentBoard = ({
  courses,
  students,
  role,
  currentUser,
}: {
  courses: CourseWithRelations[];
  students: StudentWithRelations[];
  role: string;
  currentUser: { username: string };
}) => {
  const [currentCourse, setCurrentCourse] = useState<string>(
    courses[0]?.id || "",
  );
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortCriteria, setSortCriteria] = useState<"username" | "name">(
    "username",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const router = useRouter();

  // Filter students based on role
  const filteredStudents = students.filter((student: StudentWithRelations) => {
    if (role === "INSTRUCTOR") {
      return true;
    } else if (role === "MENTOR") {
      return student.enrolledUsers?.some(
        (x) => x.mentorUsername === currentUser.username,
      );
    }
    return false;
  });

  const sortedStudents = filteredStudents
    .filter(
      (student: StudentWithRelations) =>
        student.enrolledUsers?.some((x) => x.courseId === currentCourse) &&
        (student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.username.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    .sort((a: StudentWithRelations, b: StudentWithRelations) => {
      let comparison = 0;
      if (sortCriteria === "name") {
        comparison = a.name.localeCompare(b.name);
      } else {
        comparison = a.username.localeCompare(b.username);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-2 md:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {courses?.map((course: CourseWithRelations) => (
            <button
              hidden={course.isPublished === false}
              onClick={() => setCurrentCourse(course.id)}
              className={`rounded p-2 ${currentCourse === course.id && "rounded border"}`}
              key={course.id}
            >
              <h1 className="max-w-xs truncate text-sm font-medium">
                {course.title}
              </h1>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-2">
          {/* <a
            href={"/assignments/evaluate"}
            className="inline rounded bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white"
          >
            Evaluate
          </a> */}
          <div className="bg-secondary-200 m-auto flex items-center rounded border text-black md:m-0">
            <Input
              title="input"
              placeholder="Search here"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="m-2 h-5 w-5 text-white/80" />
          </div>
        </div>
      </div>
      {sortedStudents.length > 0 ? (
        sortedStudents
          .filter((student: StudentWithRelations) =>
            student.enrolledUsers?.find((x) => x.courseId === currentCourse),
          )
          .map((student: StudentWithRelations, index: number) => (
            <div
              hidden={
                student.role === "INSTRUCTOR" || student.role === "MENTOR"
              }
              key={index}
              className={`${index < sortedStudents.length - 1 && "border-b pb-3"}`}
            >
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2 md:gap-5">
                  {index + 1}
                  <Image
                    src={student?.image || "/placeholder.jpg"}
                    height={40}
                    width={40}
                    alt=""
                    className="rounded-full"
                  />
                  <div>
                    <h1
                      className="cursor-pointer text-xs font-medium md:text-sm"
                      onClick={() => {
                        if (sortCriteria === "name") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortCriteria("name");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      {student.name}
                    </h1>
                    <h1
                      className="cursor-pointer text-xs font-medium"
                      onClick={() => {
                        if (sortCriteria === "username") {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortCriteria("username");
                          setSortOrder("asc");
                        }
                      }}
                    >
                      {student.username}
                    </h1>
                  </div>
                </div>
                {student?.role === "STUDENT" && (
                  <div
                    onClick={() =>
                      router.push(`/tutor/assignments/${student.username}`)
                    }
                    className="cursor-pointer rounded-lg bg-blue-600 p-2 text-sm font-medium text-white"
                  >
                    Assignments
                  </div>
                )}
              </div>
            </div>
          ))
      ) : (
        <NoDataFound message="No students found!" />
      )}
    </div>
  );
};

export default MentorAssignmentBoard;
