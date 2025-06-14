"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { api } from "@/trpc/react";
import type { User } from "@prisma/client";

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
  const [activeTab, setActiveTab] = useState(mentorName ? "students" : "mentors");

  const { data: mentors, isLoading: mentorsLoading } = api.statistics.getAllMentors.useQuery(
    {
      courseId,
    },
    {
      enabled: userRole === "INSTRUCTOR",
    }
  );

  const { data: mentees } = api.statistics.getAllMentees.useQuery({
    courseId,
    mentorUsername: mentorName,
  });

  const menteesArray = Array.isArray(mentees) ? mentees : [];

  const filteredMentors = Array.isArray(mentors)
    ? mentors.filter((mentor: UserWithMentor) =>
      mentor.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const filteredMentees = menteesArray.filter(
    (mentee) =>
      mentee.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (mentee.mobile || "").toLowerCase().includes(searchQuery.toLowerCase())
  ) as UserWithMentor[];

  const getHref = (type: "mentor" | "student", username: string) => {
    const baseUrl = `/tutor/statistics/${courseId}`;
    if (type === "mentor") {
      return username === mentorName ? baseUrl : `${baseUrl}?mentor=${username}`;
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
    <div className="mt-8 space-y-6 mx-4 md:mx-8">
      <div className="flex items-center justify-between">
        {userRole === "INSTRUCTOR" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="mentors">Mentors</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
              </TabsList>

              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TabsContent value="mentors" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">All Mentors</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredMentors.length} mentors found
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mentorsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <Card key={i} className="h-[120px]">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  filteredMentors.map((mentor: UserWithMentor) => (
                    <a
                      key={mentor.username}
                      href={getHref("mentor", mentor.username)}
                      className="block h-[120px]"
                    >
                      <Card
                        className={`h-full cursor-pointer transition-all hover:border-primary/50 ${mentorName === mentor.username ? "border-primary" : ""
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
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-lg font-medium">
                                  {(mentor.name || mentor.username).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{mentor.name || mentor.username}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                username: {mentor.username}
                              </p>
                              {mentor.mobile && (
                                <p className="text-sm text-muted-foreground truncate">
                                  mobile: {mentor.mobile}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">All Students</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredMentees.length} students found
                </p>
              </div>
              {mentorName && (
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Filtered by mentor: <span className="font-medium">{mentorName}</span>
                    <a
                      href={`/tutor/statistics/${courseId}`}
                      className="ml-2 text-primary hover:underline"
                    >
                      Clear filter
                    </a>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentees.map((mentee) => (
                  <a
                    key={mentee.username}
                    href={getHref("student", mentee.username)}
                    className="block h-[120px]"
                  >
                    <Card
                      className={`h-full cursor-pointer transition-all hover:border-primary/50 ${menteeName === mentee.username ? "border-primary" : ""
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
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-lg font-medium">
                                {(mentee.name || mentee.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mentee.name || mentee.username}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              username: {mentee.username}
                            </p>
                            {mentee.mentorUsername && (
                              <p className="text-sm text-muted-foreground truncate">
                                mentor: {mentee.mentorUsername}
                              </p>
                            )}
                            {mentee.mobile && (
                              <p className="text-sm text-muted-foreground truncate">
                                mobile: {mentee.mobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="relative w-[400px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">My Students</h3>
                <p className="text-sm text-muted-foreground">
                  {filteredMentees.length} students found
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMentees.map((mentee) => (
                  <a
                    key={mentee.username}
                    href={getHref("student", mentee.username)}
                    className="block h-[120px]"
                  >
                    <Card
                      className={`h-full cursor-pointer transition-all hover:border-primary/50 ${menteeName === mentee.username ? "border-primary" : ""
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
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                              <span className="text-lg font-medium">
                                {(mentee.name || mentee.username).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mentee.name || mentee.username}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              username: {mentee.username}
                            </p>
                            {mentee.mobile && (
                              <p className="text-sm text-muted-foreground truncate">
                                mobile: {mentee.mobile}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
