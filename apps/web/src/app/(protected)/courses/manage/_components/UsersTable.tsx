"use client";

import { MessageCircle, Search, UserPlus, UserX, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserLink } from "@/components/UserLink";
import {
  FaSort,
  FaSortAlphaDown,
  FaSortAlphaDownAlt,
  FaUserPlus,
} from "react-icons/fa";
import { FaUserXmark } from "react-icons/fa6";
import { MdOutlineBlock } from "react-icons/md";

import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import { Input } from "@tutly/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tutly/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@tutly/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type EnrolledUser = {
  id: string;
  courseId: string | null;
  username: string;
  mentorUsername: string | null;
  startDate: Date;
  endDate: Date | null;
};

type User = {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
  role: "STUDENT" | "MENTOR" | "INSTRUCTOR" | "ADMIN";
  image: string | null;
  enrolledUsers: EnrolledUser[];
};

type UserTableProps = {
  users: User[];
  courseId: string;
};

const UserTable = ({ users, courseId }: UserTableProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [searchBar, setSearchBar] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sortColumn, setSortColumn] = useState<string>("");
  const [activeTab, setActiveTab] = useState("enrolled");

  const courseGroupQuery = api.chat.getCourseGroup.useQuery({ courseId });
  const enrollStudent = api.courses.enrollStudentToCourse.useMutation();
  const unenrollStudent = api.courses.unenrollStudentFromCourse.useMutation();
  const updateMentor = api.courses.updateMentor.useMutation();

  const handleOpenCommunity = () => {
    const groupId = courseGroupQuery.data?.groupId;
    if (groupId) {
      router.push(`/community?g=${groupId}`);
    } else {
      router.push(`/community`);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchBar.trim().toLowerCase()) ||
      user.name?.toLowerCase().includes(searchBar.trim().toLowerCase()) ||
      user.email?.toLowerCase().includes(searchBar.trim().toLowerCase());

    if (!matchesSearch) return false;

    const isEnrolled = user.enrolledUsers.some(
      (enrolled) => enrolled.courseId === courseId,
    );

    switch (activeTab) {
      case "enrolled":
        return isEnrolled;
      case "not-enrolled":
        return !isEnrolled;
      case "mentors":
        return user.role === "MENTOR";
      case "students":
        return user.role === "STUDENT";
      default:
        return true;
    }
  });

  const displayedUsers = filteredUsers;

  const mentors = users.filter(
    (user) =>
      user.role === "MENTOR" &&
      user.enrolledUsers.some((enrolled) => enrolled.courseId === courseId),
  );

  const handleEnroll = async (username: string) => {
    const toastId = toast.loading("Enrolling user...");
    try {
      setLoading(true);

      await enrollStudent.mutateAsync({
        courseId: courseId,
        username,
      });

      toast.dismiss(toastId);
      toast.success(`${username} enrolled successfully`);
      router.refresh();
      setLoading(false);
    } catch (err: any) {
      router.refresh();
      setLoading(false);
      toast.dismiss(toastId);
      toast.error(err.message);
    }
  };

  const handleUnenroll = async (username: string) => {
    const toastId = toast.loading("Unenrolling user...");
    try {
      setLoading(true);

      await unenrollStudent.mutateAsync({
        courseId: courseId,
        username,
      });

      toast.dismiss(toastId);
      toast.success(`${username} unenrolled successfully`);
      setLoading(false);
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      toast.dismiss(toastId);
      toast.error(err.message);
    }
  };

  const handleMentorChange = async (
    username: string,
    mentorUsername: string,
  ) => {
    const toastId = toast.loading("Updating mentor...");
    try {
      setLoading(true);

      await updateMentor.mutateAsync({
        courseId: courseId,
        username,
        mentorUsername,
      });

      toast.dismiss(toastId);
      toast.success(`Mentor updated successfully`);
      setLoading(false);
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      toast.dismiss(toastId);
      toast.error(err.message);
    }
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const enrolledCount = users.filter((user) =>
    user.enrolledUsers.some((enrolled) => enrolled.courseId === courseId),
  ).length;

  const notEnrolledCount = users.length - enrolledCount;

  const mentorCount = users.filter((user) => user.role === "MENTOR").length;

  const sortedUsers = [...displayedUsers].sort((a, b) => {
    if (sortColumn) {
      if (sortColumn === "username") {
        return sortOrder === "asc"
          ? a.username.localeCompare(b.username)
          : b.username.localeCompare(a.username);
      } else if (sortColumn === "name") {
        return sortOrder === "asc"
          ? (a.name || "").localeCompare(b.name || "")
          : (b.name || "").localeCompare(a.name || "");
      } else if (sortColumn === "role") {
        return sortOrder === "asc"
          ? a.role.localeCompare(b.role)
          : b.role.localeCompare(a.role);
      } else if (sortColumn === "email") {
        return sortOrder === "asc"
          ? (a.email || "").localeCompare(b.email || "")
          : (b.email || "").localeCompare(a.email || "");
      }
    } else {
      const aEnrolled = a.enrolledUsers.some(
        (enrolled) => enrolled.courseId === courseId,
      );
      const bEnrolled = b.enrolledUsers.some(
        (enrolled) => enrolled.courseId === courseId,
      );

      if (aEnrolled && !bEnrolled) return -1;
      if (!aEnrolled && bEnrolled) return 1;

      if (a.role !== b.role) {
        if (a.role === "MENTOR") return -1;
        if (b.role === "MENTOR") return 1;
        if (a.role === "STUDENT") return -1;
        if (b.role === "STUDENT") return 1;
      }

      return a.username.localeCompare(b.username);
    }
    return 0;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage enrollments and mentor assignments for this course.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCommunity}
          disabled={courseGroupQuery.isLoading}
          className="gap-2 self-start sm:self-auto"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Notify in Community
        </Button>
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-muted/40 inline-flex h-9 items-center gap-1 rounded-lg p-1">
              <TabsTrigger
                value="enrolled"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 gap-1.5 rounded-md px-3 text-xs font-medium"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Enrolled
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {enrolledCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="not-enrolled"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 gap-1.5 rounded-md px-3 text-xs font-medium"
              >
                <UserX className="h-3.5 w-3.5" />
                Not enrolled
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {notEnrolledCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="mentors"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 gap-1.5 rounded-md px-3 text-xs font-medium"
              >
                Mentors
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {mentorCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-background data-[state=active]:text-foreground h-7 gap-1.5 rounded-md px-3 text-xs font-medium"
              >
                <Users className="h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                  {users.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search username, name, email"
              value={searchBar}
              onChange={(e) => setSearchBar(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-muted-foreground w-12 text-[11px] font-medium tracking-wide uppercase">
                  #
                </TableHead>
                <TableHead
                  onClick={() => handleSort("username")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-medium tracking-wide uppercase"
                >
                  <span className="inline-flex items-center gap-1">
                    User
                    {sortColumn === "username" ? (
                      sortOrder === "asc" ? (
                        <FaSortAlphaDown className="h-3 w-3" />
                      ) : (
                        <FaSortAlphaDownAlt className="h-3 w-3" />
                      )
                    ) : (
                      <FaSort className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("role")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-medium tracking-wide uppercase"
                >
                  <span className="inline-flex items-center gap-1">
                    Role
                    {sortColumn === "role" ? (
                      sortOrder === "asc" ? (
                        <FaSortAlphaDown className="h-3 w-3" />
                      ) : (
                        <FaSortAlphaDownAlt className="h-3 w-3" />
                      )
                    ) : (
                      <FaSort className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </TableHead>
                <TableHead
                  onClick={() => handleSort("email")}
                  className="text-muted-foreground hover:text-foreground hidden cursor-pointer text-[11px] font-medium tracking-wide uppercase md:table-cell"
                >
                  <span className="inline-flex items-center gap-1">
                    Email
                    {sortColumn === "email" ? (
                      sortOrder === "asc" ? (
                        <FaSortAlphaDown className="h-3 w-3" />
                      ) : (
                        <FaSortAlphaDownAlt className="h-3 w-3" />
                      )
                    ) : (
                      <FaSort className="h-3 w-3 opacity-50" />
                    )}
                  </span>
                </TableHead>
                <TableHead className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                  Mentor
                </TableHead>
                <TableHead className="text-muted-foreground text-right text-[11px] font-medium tracking-wide uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <MdOutlineBlock className="text-muted-foreground h-6 w-6" />
                      <span className="text-muted-foreground text-sm">
                        No users found
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {sortedUsers.map((user, index) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <UserLink
                      username={user.username}
                      className="flex items-center gap-3"
                    >
                      <Image
                        src={user.image || "/placeholder.jpg"}
                        alt={user.username}
                        width={32}
                        height={32}
                        className="ring-border h-8 w-8 rounded-full object-cover ring-1"
                      />
                      <div className="min-w-0">
                        <div className="text-foreground truncate text-sm font-medium">
                          {user.name ?? user.username}
                        </div>
                        <div className="text-muted-foreground truncate text-[11px]">
                          @{user.username}
                        </div>
                      </div>
                    </UserLink>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "INSTRUCTOR" ? "secondary" : "outline"
                      }
                      className="text-[10px] font-medium tracking-wide uppercase"
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    {user.role === "STUDENT" &&
                    user.enrolledUsers.some(
                      (enrolled) => enrolled.courseId === courseId,
                    ) ? (
                      <Select
                        value={
                          user.enrolledUsers.find(
                            (enrolled) => enrolled.courseId === courseId,
                          )?.mentorUsername || "none"
                        }
                        onValueChange={(v) =>
                          handleMentorChange(
                            user.username,
                            v === "none" ? "" : v,
                          )
                        }
                        disabled={loading}
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {mentors.map((mentor) => (
                            <SelectItem key={mentor.id} value={mentor.username}>
                              {mentor.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {user.role === "INSTRUCTOR" ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : !user.enrolledUsers.some(
                        (enrolled) => enrolled.courseId === courseId,
                      ) ? (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={loading}
                        onClick={() => handleEnroll(user.username)}
                        variant="outline"
                      >
                        <FaUserPlus className="h-3.5 w-3.5" />
                        Enroll
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={loading}
                        onClick={() => handleUnenroll(user.username)}
                        variant="ghost"
                      >
                        <FaUserXmark className="text-destructive h-3.5 w-3.5" />
                        Unenroll
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default UserTable;
