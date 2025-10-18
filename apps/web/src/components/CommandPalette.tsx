"use client";

import * as React from "react";
import {
  BookOpenIcon,
  CalendarIcon,
  FileTextIcon,
  HelpCircleIcon,
  HomeIcon,
  PlusCircleIcon,
  SearchIcon,
  SettingsIcon,
  TrophyIcon,
  UsersIcon,
  VideoIcon,
  ClockIcon,
  BookMarkedIcon,
  BarChartIcon,
  CodeIcon,
  SparklesIcon,
  LogOutIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/auth";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

type CategoryFilter =
  | "all"
  | "courses"
  | "classes"
  | "assignments"
  | "doubts"
  | "users"
  | "schedule";

interface CommandPaletteProps {
  user: SessionUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({
  user,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategories, setSelectedCategories] = React.useState<
    CategoryFilter[]
  >(["all"]);
  const [activeTab, setActiveTab] = React.useState<"quick" | "browse">("quick");
  const [creationMode, setCreationMode] = React.useState<
    "class" | "assignment" | null
  >(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedCategories(["all"]);
      setActiveTab("quick");
      setCreationMode(null);
    }
  }, [open]);

  // Search query
  const { data: searchResults, isLoading } = api.search.globalSearch.useQuery(
    {
      query: debouncedSearch,
      categories: selectedCategories,
      limit: 8,
    },
    {
      enabled: debouncedSearch.length > 0 && open,
      refetchOnWindowFocus: false,
    },
  );

  // Recent items query
  const { data: recentItems } = api.search.getRecentItems.useQuery(undefined, {
    enabled: open && !debouncedSearch,
    refetchOnWindowFocus: false,
  });

  const toggleCategory = (category: CategoryFilter) => {
    if (category === "all") {
      setSelectedCategories(["all"]);
      setCreationMode(null);
    } else {
      setSelectedCategories((prev) => {
        const filtered = prev.filter((c) => c !== "all");
        if (filtered.includes(category)) {
          const newCategories = filtered.filter((c) => c !== category);
          return newCategories.length === 0 ? ["all"] : newCategories;
        } else {
          return [...filtered, category];
        }
      });

      if (category !== "courses") {
        setCreationMode(null);
      }
    }
  };

  const categoryOptions: {
    value: CategoryFilter;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "all", label: "All", icon: SearchIcon },
    { value: "courses", label: "Courses", icon: BookOpenIcon },
    { value: "classes", label: "Classes", icon: VideoIcon },
    { value: "assignments", label: "Assignments", icon: FileTextIcon },
    { value: "doubts", label: "Doubts", icon: HelpCircleIcon },
    { value: "schedule", label: "Schedule", icon: CalendarIcon },
  ];

  if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
    categoryOptions.push({ value: "users", label: "Users", icon: UsersIcon });
  }

  const handleSelect = React.useCallback(
    (callback: () => void, keepOpen = false) => {
      if (!keepOpen) {
        onOpenChange(false);
      }
      callback();
    },
    [onOpenChange],
  );

  // Derive placeholder from selected categories
  const getPlaceholder = () => {
    if (selectedCategories.includes("all") || selectedCategories.length === 0) {
      if (user.role === "INSTRUCTOR" || user.role === "MENTOR") {
        return "Search students, classes, assignments, or type a command...";
      }
      return "Search courses, classes, assignments, or type a command...";
    }

    const categoryLabels = {
      courses: "courses",
      classes: "classes",
      assignments: "assignments",
      doubts: "doubts",
      users: "students",
      schedule: "events",
    };

    const selectedLabels = selectedCategories
      .filter((cat) => cat !== "all")
      .map((cat) => categoryLabels[cat as keyof typeof categoryLabels] || cat)
      .join(", ");

    if (creationMode === "class") {
      return "Select a course to create class...";
    } else if (creationMode === "assignment") {
      return "Select a course to create assignment...";
    }

    return `Search for ${selectedLabels}...`;
  };

  // Navigation items based on role
  const navigationItems = React.useMemo(() => {
    const baseItems = [
      {
        icon: HomeIcon,
        label: "Dashboard",
        action: () => router.push("/dashboard"),
        keywords: ["home", "overview"],
      },
      {
        icon: BookOpenIcon,
        label: "Courses",
        action: () => router.push("/courses"),
        keywords: ["course", "learn", "study"],
      },
      {
        icon: CalendarIcon,
        label: "Schedule",
        action: () => router.push("/schedule"),
        keywords: ["calendar", "events", "timing"],
      },
      {
        icon: HelpCircleIcon,
        label: "Doubts",
        action: () => router.push("/doubts"),
        keywords: ["questions", "help", "ask"],
      },
      {
        icon: BookMarkedIcon,
        label: "Bookmarks",
        action: () => router.push("/bookmarks"),
        keywords: ["saved", "favorites"],
      },
    ];

    if (user.role === "INSTRUCTOR") {
      baseItems.push(
        {
          icon: UsersIcon,
          label: "Manage Students",
          action: () => router.push("/tutor/manage-students"),
          keywords: ["students", "users", "enrollments"],
        },
        {
          icon: BarChartIcon,
          label: "Statistics",
          action: () => router.push("/tutor/statistics"),
          keywords: ["analytics", "reports", "data"],
        },
        {
          icon: TrophyIcon,
          label: "Leaderboard",
          action: () => router.push("/tutor/leaderboard"),
          keywords: ["rankings", "top", "scores"],
        },
      );
    }

    if (user.role === "STUDENT") {
      baseItems.push(
        {
          icon: TrophyIcon,
          label: "Leaderboard",
          action: () => router.push("/leaderboard"),
          keywords: ["rankings", "top", "scores"],
        },
        {
          icon: CodeIcon,
          label: "Playgrounds",
          action: () => router.push("/playgrounds"),
          keywords: ["code", "practice", "editor"],
        },
      );
    }

    if (user.role === "MENTOR") {
      baseItems.push(
        {
          icon: UsersIcon,
          label: "My Mentees",
          action: () => router.push("/mentor/mentees"),
          keywords: ["students", "mentoring"],
        },
        {
          icon: BarChartIcon,
          label: "Statistics",
          action: () => router.push("/statistics"),
          keywords: ["analytics", "reports", "data"],
        },
      );
    }

    baseItems.push({
      icon: SettingsIcon,
      label: "Settings",
      action: () => router.push("/profile"),
      keywords: ["preferences", "profile", "account"],
    });

    return baseItems;
  }, [user.role, router]);

  // Quick actions (most used - Tab 1)
  const quickActions = React.useMemo(() => {
    const actions = [];

    if (user.role === "INSTRUCTOR") {
      actions.push(
        {
          icon: VideoIcon,
          label: "Create New Class",
          action: () => {
            setSelectedCategories(["courses"]);
            setSearchQuery("");
            setActiveTab("quick");
            setCreationMode("class");
          },
          keepOpen: true,
        },
        {
          icon: FileTextIcon,
          label: "Create Assignment",
          action: () => {
            setSelectedCategories(["courses"]);
            setSearchQuery("");
            setActiveTab("quick");
            setCreationMode("assignment");
          },
          keepOpen: true,
        },
        {
          icon: PlusCircleIcon,
          label: "Create New Course",
          action: () => router.push("/courses?modal=create"),
        },
        {
          icon: BarChartIcon,
          label: "View Statistics",
          action: () => router.push("/tutor/statistics"),
        },
        {
          icon: UsersIcon,
          label: "Manage Students",
          action: () => router.push("/tutor/manage-users"),
        },
      );
    }

    if (user.role === "MENTOR") {
      actions.push(
        {
          icon: UsersIcon,
          label: "View My Mentees",
          action: () => router.push("/tutor/manage-users"),
        },
        {
          icon: FileTextIcon,
          label: "Review Submissions",
          action: () => router.push("/tutor/assignments"),
        },
        {
          icon: HelpCircleIcon,
          label: "View Doubts",
          action: () => router.push("/community"),
        },
      );
    }

    if (user.role === "STUDENT") {
      actions.push(
        {
          icon: TrophyIcon,
          label: "View Leaderboard",
          action: () => router.push("/leaderboard"),
        },
        {
          icon: CodeIcon,
          label: "Open Playgrounds",
          action: () => router.push("/playgrounds"),
        },
        {
          icon: CalendarIcon,
          label: "Check Attendance",
          action: () => router.push("/tutor/attendance"),
        },
      );
    }

    return actions;
  }, [user.role, router]);

  // Browse actions (Tab 2)
  const browseActions = React.useMemo(() => {
    const actions = [];

    if (user.role === "INSTRUCTOR") {
      actions.push(
        {
          icon: UsersIcon,
          label: "Search Students",
          action: () => {
            setSelectedCategories(["users"]);
            setSearchQuery("");
            setActiveTab("quick"); // Switch to quick tab to show search
            // Focus the input after state updates
          },
          keepOpen: true,
        },
        {
          icon: TrophyIcon,
          label: "View Leaderboard",
          action: () => router.push("/tutor/leaderboard"),
        },
        {
          icon: FileTextIcon,
          label: "Review Submissions",
          action: () => router.push("/tutor/assignments"),
        },
        {
          icon: HelpCircleIcon,
          label: "Browse All Doubts",
          action: () => {
            setSelectedCategories(["doubts"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: CalendarIcon,
          label: "Browse Schedule",
          action: () => {
            setSelectedCategories(["schedule"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: BookOpenIcon,
          label: "Browse All Courses",
          action: () => {
            setSelectedCategories(["courses"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: VideoIcon,
          label: "Browse All Classes",
          action: () => {
            setSelectedCategories(["classes"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: FileTextIcon,
          label: "Browse All Assignments",
          action: () => {
            setSelectedCategories(["assignments"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
      );
    }

    if (user.role === "MENTOR") {
      actions.push(
        {
          icon: BarChartIcon,
          label: "View Statistics",
          action: () => router.push("/tutor/statistics"),
        },
        {
          icon: CalendarIcon,
          label: "Browse Schedule",
          action: () => {
            setSelectedCategories(["schedule"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: BookOpenIcon,
          label: "Browse Courses",
          action: () => {
            setSelectedCategories(["courses"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
      );
    }

    if (user.role === "STUDENT") {
      actions.push(
        {
          icon: FileTextIcon,
          label: "Browse My Assignments",
          action: () => {
            setSelectedCategories(["assignments"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: HelpCircleIcon,
          label: "My Doubts",
          action: () => router.push("/community"),
        },
        {
          icon: BookMarkedIcon,
          label: "View Bookmarks",
          action: () => router.push("/bookmarks"),
        },
        {
          icon: CalendarIcon,
          label: "Browse Schedule",
          action: () => {
            setSelectedCategories(["schedule"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
        {
          icon: BookOpenIcon,
          label: "Browse Courses",
          action: () => {
            setSelectedCategories(["courses"]);
            setSearchQuery("");
            setActiveTab("quick");
          },
          keepOpen: true,
        },
      );
    }

    return actions;
  }, [user.role, router, setSelectedCategories, setSearchQuery]);

  // System actions (always available)
  const systemActions = React.useMemo(() => {
    return [
      {
        icon: SettingsIcon,
        label: "Open Settings",
        action: () => router.push("/profile"),
        keywords: ["settings", "preferences", "profile"],
      },
      {
        icon: BookMarkedIcon,
        label: "View Bookmarks",
        action: () => router.push("/bookmarks"),
        keywords: ["bookmarks", "saved", "favorites"],
      },
      {
        icon: LogOutIcon,
        label: "Sign Out",
        action: () => router.push("/api/auth/sign-out"),
        keywords: ["logout", "sign out", "exit"],
      },
    ];
  }, [router]);

  const hasResults = React.useMemo(() => {
    if (!searchResults?.data) return false;
    const { courses, classes, assignments, doubts, users, schedule } =
      searchResults.data;
    return (
      courses.length > 0 ||
      classes.length > 0 ||
      assignments.length > 0 ||
      doubts.length > 0 ||
      users.length > 0 ||
      schedule.length > 0
    );
  }, [searchResults]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      showCloseButton={false}
      shouldFilter={false}
    >
      <CommandInput
        ref={inputRef}
        placeholder={getPlaceholder()}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />

      {!debouncedSearch &&
        (selectedCategories.includes("all") ||
          selectedCategories.length === 0) &&
        !creationMode && (
          <div className="bg-background flex border-b">
            <button
              onClick={() => setActiveTab("quick")}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "quick"
                  ? "border-primary text-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Quick Access
            </button>
            <button
              onClick={() => setActiveTab("browse")}
              className={cn(
                "flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "browse"
                  ? "border-primary text-primary border-b-2"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Browse
            </button>
          </div>
        )}

      {(debouncedSearch ||
        (selectedCategories.length > 0 &&
          !selectedCategories.includes("all")) ||
        creationMode) && (
        <div className="bg-background flex flex-wrap gap-1.5 border-b px-3 py-2">
          {categoryOptions.map((category) => {
            const isSelected = selectedCategories.includes(category.value);
            const Icon = category.icon;
            return (
              <button
                key={category.value}
                onClick={() => toggleCategory(category.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                )}
              >
                <Icon className="h-3 w-3" />
                {category.label}
              </button>
            );
          })}
        </div>
      )}

      <CommandList>
        {isLoading && (
          <div className="text-muted-foreground py-6 text-center text-sm">
            Searching...
          </div>
        )}

        {!isLoading && debouncedSearch && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* Search Results */}
        {debouncedSearch && searchResults?.data && (
          <>
            {/* Courses */}
            {searchResults.data.courses.length > 0 && (
              <>
                <CommandGroup heading="Courses">
                  {searchResults.data.courses.map((course: any) => (
                    <CommandItem
                      key={course.id}
                      onSelect={() => {
                        if (creationMode === "class") {
                          handleSelect(
                            () => router.push(`/courses/${course.id}/classes`),
                            true,
                          );
                        } else if (creationMode === "assignment") {
                          handleSelect(
                            () => router.push(`/courses/${course.id}/classes`),
                            true,
                          );
                        } else {
                          handleSelect(() =>
                            router.push(`/courses/${course.id}`),
                          );
                        }
                      }}
                    >
                      <BookOpenIcon className="text-primary mr-2 h-4 w-4" />
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <span className="font-medium">{course.title}</span>
                        <div className="flex items-center gap-1.5">
                          {creationMode && (
                            <span className="text-muted-foreground">→</span>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {course._count.classes} classes
                          </Badge>
                          {(user.role === "INSTRUCTOR" ||
                            user.role === "MENTOR") && (
                            <Badge variant="outline" className="text-xs">
                              {course._count.enrolledUsers} students
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Classes */}
            {searchResults.data.classes.length > 0 && (
              <>
                <CommandGroup heading="Classes">
                  {searchResults.data.classes.map((cls: any) => (
                    <CommandItem
                      key={cls.id}
                      onSelect={() =>
                        handleSelect(() =>
                          router.push(
                            `/courses/${cls.courseId}/classes/${cls.id}`,
                          ),
                        )
                      }
                    >
                      <VideoIcon className="text-primary mr-2 h-4 w-4" />
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium">{cls.title}</span>
                        <span className="text-muted-foreground text-xs">
                          {cls.course?.title}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Assignments */}
            {searchResults.data.assignments.length > 0 && (
              <>
                <CommandGroup heading="Assignments">
                  {searchResults.data.assignments.map((assignment: any) => (
                    <CommandItem
                      key={assignment.id}
                      onSelect={() =>
                        handleSelect(() =>
                          router.push(`/assignments/${assignment.id}`),
                        )
                      }
                    >
                      <FileTextIcon className="text-primary mr-2 h-4 w-4" />
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {assignment.title}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {assignment.course?.title}
                          </span>
                        </div>
                        {assignment.dueDate && (
                          <Badge
                            variant={
                              new Date(assignment.dueDate) < new Date()
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Doubts */}
            {searchResults.data.doubts.length > 0 && (
              <>
                <CommandGroup heading="Doubts">
                  {searchResults.data.doubts.map((doubt: any) => (
                    <CommandItem
                      key={doubt.id}
                      onSelect={() =>
                        handleSelect(() =>
                          router.push(
                            `/doubts/${doubt.courseId}?doubtId=${doubt.id}`,
                          ),
                        )
                      }
                    >
                      <HelpCircleIcon className="text-primary mr-2 h-4 w-4" />
                      <div className="flex flex-1 flex-col">
                        <span className="line-clamp-1 font-medium">
                          {doubt.title}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            by {doubt.user.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {doubt._count.response} responses
                          </Badge>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Users (for instructors and mentors) */}
            {searchResults.data.users &&
              searchResults.data.users.length > 0 && (
                <>
                  <CommandGroup heading="Users">
                    {searchResults.data.users.map((u: any) => (
                      <CommandItem
                        key={u.id}
                        onSelect={() =>
                          handleSelect(() =>
                            router.push(`/profile/${u.username}`),
                          )
                        }
                      >
                        <UsersIcon className="text-primary mr-2 h-4 w-4" />
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium">{u.name}</span>
                            <span className="text-muted-foreground text-xs">
                              @{u.username}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {u.role.toLowerCase()}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

            {/* Schedule Events */}
            {searchResults.data.schedule.length > 0 && (
              <>
                <CommandGroup heading="Schedule">
                  {searchResults.data.schedule.map((event: any) => (
                    <CommandItem
                      key={event.id}
                      onSelect={() =>
                        handleSelect(() =>
                          router.push(`/schedule?eventId=${event.id}`),
                        )
                      }
                    >
                      <CalendarIcon className="text-primary mr-2 h-4 w-4" />
                      <div className="flex flex-1 items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(event.startTime).toLocaleDateString()}
                          </span>
                        </div>
                        <Badge
                          variant={event.isPublished ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {event.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
          </>
        )}

        {/* Show content when categories are selected but no search query */}
        {!debouncedSearch &&
          selectedCategories.length > 0 &&
          !selectedCategories.includes("all") &&
          !creationMode && (
            <div className="py-6 text-center">
              <div className="text-muted-foreground mb-2 text-sm">
                You can only search for{" "}
                {selectedCategories
                  .map((cat) => (cat === "users" ? "students" : cat))
                  .join(", ")}
                .
              </div>
              <div className="text-muted-foreground text-xs">
                If you want to search for others, please change filters
                accordingly.
              </div>
            </div>
          )}

        {/* Show courses when in creation mode */}
        {!debouncedSearch &&
          creationMode &&
          selectedCategories.includes("courses") && (
            <>
              {recentItems?.data && recentItems.data.courses.length > 0 ? (
                <>
                  <CommandGroup
                    heading={`Select Course to Create ${creationMode === "class" ? "Class" : "Assignment"}`}
                  >
                    {recentItems.data.courses.map((course: any) => (
                      <CommandItem
                        key={course.id}
                        onSelect={() => {
                          if (creationMode === "class") {
                            handleSelect(
                              () =>
                                router.push(
                                  `/courses/${course.id}/classes?modal=newClass`,
                                ),
                              false,
                            );
                          } else if (creationMode === "assignment") {
                            handleSelect(
                              () =>
                                router.push(
                                  `/courses/${course.id}/classes?modal=newAssignment`,
                                ),
                              false,
                            );
                          }
                        }}
                      >
                        <BookOpenIcon className="text-primary mr-2 h-4 w-4" />
                        <div className="flex flex-1 items-center justify-between gap-2">
                          <span>{course.title}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {course._count?.classes || 0} classes
                            </Badge>
                            {user.role === "INSTRUCTOR" &&
                              course._count?.enrolledUsers > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {course._count.enrolledUsers} students
                                </Badge>
                              )}
                            {user.role === "MENTOR" &&
                              course._count?.mentees > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {course._count.mentees} mentees
                                </Badge>
                              )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              ) : (
                <div className="py-6 text-center">
                  <div className="text-muted-foreground mb-2 text-sm">
                    {recentItems?.data
                      ? `No courses available for creating ${creationMode === "class" ? "classes" : "assignments"}.`
                      : "Loading courses..."}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {recentItems?.data
                      ? "You need to be enrolled in or have access to courses to create content."
                      : "Please wait while we fetch your courses."}
                  </div>
                </div>
              )}
            </>
          )}

        {!debouncedSearch &&
          (selectedCategories.includes("all") ||
            selectedCategories.length === 0) &&
          !creationMode && (
            <>
              {/* Quick Access Tab */}
              {activeTab === "quick" && (
                <>
                  {/* Quick Actions */}
                  {quickActions.length > 0 && (
                    <>
                      <CommandGroup heading="Quick Actions">
                        {quickActions.map((action) => (
                          <CommandItem
                            key={action.label}
                            onSelect={() =>
                              handleSelect(action.action, action.keepOpen)
                            }
                          >
                            <action.icon className="text-primary mr-2 h-4 w-4" />
                            <span>{action.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandSeparator />
                    </>
                  )}

                  {/* Recent Items */}
                  {recentItems?.data && (
                    <>
                      {recentItems.data.courses.length > 0 && (
                        <>
                          <CommandGroup heading="Recent Courses">
                            {recentItems.data.courses.map((course: any) => (
                              <CommandItem
                                key={course.id}
                                onSelect={() => {
                                  if (creationMode === "class") {
                                    handleSelect(
                                      () =>
                                        router.push(
                                          `/courses/${course.id}/classes?modal=newClass`,
                                        ),
                                      false,
                                    );
                                  } else if (creationMode === "assignment") {
                                    handleSelect(
                                      () =>
                                        router.push(
                                          `/courses/${course.id}/classes?modal=newAssignment`,
                                        ),
                                      false,
                                    );
                                  } else {
                                    handleSelect(() =>
                                      router.push(`/courses/${course.id}`),
                                    );
                                  }
                                }}
                              >
                                <BookOpenIcon className="text-primary mr-2 h-4 w-4" />
                                <div className="flex flex-1 items-center justify-between gap-2">
                                  <span>{course.title}</span>
                                  <div className="flex items-center gap-1.5">
                                    {creationMode && (
                                      <span className="text-muted-foreground">
                                        →
                                      </span>
                                    )}
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {course._count?.classes || 0} classes
                                    </Badge>
                                    {user.role === "INSTRUCTOR" &&
                                      course._count?.enrolledUsers > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {course._count.enrolledUsers} students
                                        </Badge>
                                      )}
                                    {user.role === "MENTOR" &&
                                      course._count?.mentees > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          {course._count.mentees} mentees
                                        </Badge>
                                      )}
                                    <ClockIcon className="text-muted-foreground h-3 w-3" />
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}

                      {recentItems.data.classes.length > 0 && (
                        <>
                          <CommandGroup heading="Recent Classes">
                            {recentItems.data.classes.map((cls: any) => (
                              <CommandItem
                                key={cls.id}
                                onSelect={() =>
                                  handleSelect(() =>
                                    router.push(
                                      `/courses/${cls.courseId}/classes/${cls.id}`,
                                    ),
                                  )
                                }
                              >
                                <VideoIcon className="text-primary mr-2 h-4 w-4" />
                                <div className="flex flex-col">
                                  <span>{cls.title}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {cls.course?.title}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}

                      {recentItems.data.assignments.length > 0 && (
                        <>
                          <CommandGroup heading="Recent Assignments">
                            {recentItems.data.assignments.map(
                              (assignment: any) => (
                                <CommandItem
                                  key={assignment.id}
                                  onSelect={() =>
                                    handleSelect(() =>
                                      router.push(
                                        `/assignments/${assignment.id}`,
                                      ),
                                    )
                                  }
                                >
                                  <FileTextIcon className="text-primary mr-2 h-4 w-4" />
                                  <div className="flex flex-col">
                                    <span>{assignment.title}</span>
                                    <span className="text-muted-foreground text-xs">
                                      {assignment.course?.title}
                                    </span>
                                  </div>
                                </CommandItem>
                              ),
                            )}
                          </CommandGroup>
                          <CommandSeparator />
                        </>
                      )}
                    </>
                  )}

                  {/* Navigation */}
                  <CommandGroup heading="Navigation">
                    {navigationItems.map((item) => (
                      <CommandItem
                        key={item.label}
                        onSelect={() => handleSelect(item.action)}
                      >
                        <item.icon className="text-primary mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Browse Tab */}
              {activeTab === "browse" && (
                <>
                  <CommandGroup heading="Browse & Filter">
                    {browseActions.map((action) => (
                      <CommandItem
                        key={action.label}
                        onSelect={() =>
                          handleSelect(action.action, action.keepOpen)
                        }
                      >
                        <action.icon className="text-primary mr-2 h-4 w-4" />
                        <span>{action.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {/* System Actions */}
                  {systemActions.length > 0 && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading="System">
                        {systemActions.map((action) => (
                          <CommandItem
                            key={action.label}
                            onSelect={() => handleSelect(action.action)}
                          >
                            <action.icon className="text-primary mr-2 h-4 w-4" />
                            <span>{action.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </>
          )}
      </CommandList>
    </CommandDialog>
  );
}

interface CommandPaletteTriggerProps {
  onClick: () => void;
  className?: string;
}

export function CommandPaletteTrigger({
  onClick,
  className,
}: CommandPaletteTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 w-full max-w-xs items-center gap-2 rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none",
        className,
      )}
    >
      <SearchIcon className="text-muted-foreground h-4 w-4" />
      <span className="text-muted-foreground flex-1 text-left">Search...</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
