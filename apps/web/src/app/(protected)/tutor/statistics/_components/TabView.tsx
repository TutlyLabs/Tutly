"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import type { User } from "@prisma/client";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type UserWithMentor = User & {
  mentorUsername?: string;
};

interface TabViewProps {
  mentorName: string;
  menteeName: string;
  courseId: string;
  userRole: "INSTRUCTOR" | "MENTOR";
}

export default function TabView({
  mentorName,
  menteeName,
  courseId,
  userRole,
}: TabViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(
    mentorName ? "students" : "mentors",
  );

  const { data: mentors, isLoading: mentorsLoading } =
    api.statistics.getAllMentors.useQuery(
      {
        courseId,
      },
      {
        enabled: userRole === "INSTRUCTOR",
      },
    );

  const { data: mentees } = api.statistics.getAllMentees.useQuery({
    courseId,
    mentorUsername: mentorName,
  });

  const menteesArray = Array.isArray(mentees) ? mentees : [];

  const filteredMentors = Array.isArray(mentors)
    ? mentors.filter((mentor: UserWithMentor) =>
        mentor.username.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const filteredMentees = menteesArray.filter(
    (mentee) =>
      mentee.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mentee.mobile || "").toLowerCase().includes(searchQuery.toLowerCase()),
  ) as UserWithMentor[];

  const getHref = (type: "mentor" | "student", username: string) => {
    const baseUrl = `/tutor/statistics/${courseId}`;
    if (type === "mentor") {
      return username === mentorName
        ? baseUrl
        : `${baseUrl}?mentor=${username}`;
    } else {
      const params = new URLSearchParams();
      if (userRole === "MENTOR") {
        params.set("mentor", mentorName);
      } else if (mentorName) {
        params.set("mentor", mentorName);
      }
      if (username !== menteeName) params.set("student", username);
      const queryString = params.toString();
      return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }
  };

  return (
    <div className="mx-4 mt-8 space-y-6 md:mx-8">
      <div className="flex items-center justify-between">
        {userRole === "INSTRUCTOR" ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-6 flex items-center justify-between">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="mentors">Mentors</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>

              <div className="relative w-[400px]">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by name, username or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TabsContent value="mentors" className="mt-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">All Mentors</h3>
                <p className="text-muted-foreground text-sm">
                  {filteredMentors.length} mentors found
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mentorsLoading
                  ? [...Array(6)].map((_, i) => (
                      <Card key={i} className="h-[120px]">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="bg-muted h-12 w-12 animate-pulse rounded-full" />
                            <div className="flex-1 space-y-2">
                              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                              <div className="bg-muted h-3 w-32 animate-pulse rounded" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : filteredMentors.map((mentor: UserWithMentor) => (
                      <Link
                        key={mentor.username}
                        href={getHref("mentor", mentor.username)}
                        className="block h-[120px]"
                      >
                        <Card
                          className={`hover:border-primary/50 h-full cursor-pointer transition-all ${
                            mentorName === mentor.username
                              ? "border-primary"
                              : ""
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              {mentor.image ? (
                                <Image
                                  src={mentor.image}
                                  alt={mentor.username}
                                  width={48}
                                  height={48}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                                  <span className="text-lg font-medium">
                                    {(mentor.name || mentor.username)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {mentor.name || mentor.username}
                                </p>
                                <p className="text-muted-foreground truncate text-sm">
                                  username: {mentor.username}
                                </p>
                                {mentor.mobile && (
                                  <p className="text-muted-foreground truncate text-sm">
                                    mobile: {mentor.mobile}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">All Students</h3>
                <p className="text-muted-foreground text-sm">
                  {filteredMentees.length} students found
                </p>
              </div>
              {mentorName && (
                <div className="bg-muted mb-4 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">
                    Filtered by mentor:{" "}
                    <span className="font-medium">{mentorName}</span>
                    <Link
                      href={`/tutor/statistics/${courseId}`}
                      className="text-primary ml-2 hover:underline"
                    >
                      Clear filter
                    </Link>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentees.map((mentee) => (
                  <Link
                    key={mentee.username}
                    href={getHref("student", mentee.username)}
                    className="block h-[120px]"
                  >
                    <Card
                      className={`hover:border-primary/50 h-full cursor-pointer transition-all ${
                        menteeName === mentee.username ? "border-primary" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {mentee.image ? (
                            <Image
                              src={mentee.image}
                              alt={mentee.username}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                              <span className="text-lg font-medium">
                                {(mentee.name || mentee.username)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {mentee.name || mentee.username}
                            </p>
                            <p className="text-muted-foreground truncate text-sm">
                              username: {mentee.username}
                            </p>
                            {mentee.mentorUsername && (
                              <p className="text-muted-foreground truncate text-sm">
                                mentor: {mentee.mentorUsername}
                              </p>
                            )}
                            {mentee.mobile && (
                              <p className="text-muted-foreground truncate text-sm">
                                mobile: {mentee.mobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
              <div className="relative w-[400px]">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search by name, username or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">My Students</h3>
                <p className="text-muted-foreground text-sm">
                  {filteredMentees.length} students found
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMentees.map((mentee) => (
                  <Link
                    key={mentee.username}
                    href={getHref("student", mentee.username)}
                    className="block h-[120px]"
                  >
                    <Card
                      className={`hover:border-primary/50 h-full cursor-pointer transition-all ${
                        menteeName === mentee.username ? "border-primary" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          {mentee.image ? (
                            <Image
                              src={mentee.image}
                              alt={mentee.username}
                              width={48}
                              height={48}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                              <span className="text-lg font-medium">
                                {(mentee.name || mentee.username)
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {mentee.name || mentee.username}
                            </p>
                            <p className="text-muted-foreground truncate text-sm">
                              username: {mentee.username}
                            </p>
                            {mentee.mobile && (
                              <p className="text-muted-foreground truncate text-sm">
                                mobile: {mentee.mobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
