"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Linkedin,
  Twitter,
  Globe,
  ExternalLink,
  MapPin,
  Calendar,
  BookOpen,
  Share2,
  Briefcase,
  GraduationCap,
  ArrowLeft,
  MessageSquare,
  FolderOpen,
  Link2,
  Sparkles,
  Plus,
  BadgeCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@tutly/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tutly/ui/tooltip";
import { Input } from "@tutly/ui/input";
import { Textarea } from "@tutly/ui/textarea";
import ProfessionalProfilesEditor from "@/app/(protected)/profile/_components/ProfessionalProfiles";
import SocialLinksEditor from "@/app/(protected)/profile/_components/SocialLinks";
import AcademicDetailsEditor from "@/app/(protected)/profile/_components/AcademicDetails";
import ExperienceEditor from "@/app/(protected)/profile/_components/Experience";
import { ProjectsEditor } from "@/app/(protected)/profile/_components/ProjectsEditor";
import {
  SiLeetcode,
  SiCodeforces,
  SiCodechef,
  SiHackerrank,
  SiGithub,
} from "react-icons/si";
import type { IconType } from "react-icons";

import { Button } from "@tutly/ui/button";
import { cn } from "@tutly/utils";
import { format, differenceInMonths, differenceInYears } from "date-fns";
import { toast } from "sonner";
import { useClientSession } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { UserAvatar } from "@/components/UserAvatar";

interface SocialLinks {
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  quora?: string;
  website?: string;
}

interface ProfessionalProfiles {
  github?: string;
  leetcode?: string;
  codechef?: string;
  codeforces?: string;
  hackerrank?: string;
}

interface AcademicDetails {
  rollNumber?: string;
  cgpa?: string;
  branch?: string;
  section?: string;
  academicYear?: string;
  college?: string;
}

interface Experience {
  company?: string;
  role?: string;
  workLocation?: string;
  workCity?: string;
  startDate?: string;
  endDate?: string;
}

interface Project {
  title?: string;
  description?: string;
  url?: string;
  techStack?: string[];
}

interface ActivityDay {
  date: string;
  count: number;
}

interface Profile {
  id: string;
  name: string;
  username: string;
  image: string | null;
  role: string;
  createdAt: string;
  activityHeatmap?: ActivityDay[];
  profile: {
    headline?: string | null;
    skills?: string[];
    aboutMe?: string | null;
    hobbies?: string[];
    socialLinks?: SocialLinks | null;
    professionalProfiles?: ProfessionalProfiles | null;
    academicDetails?: AcademicDetails | null;
    experiences?: Experience[];
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: { city?: string; state?: string; country?: string } | null;
    metadata?: { projects?: Project[] } | null;
  } | null;
  enrolledUsers?: Array<{
    course: { id: string; title: string; image: string | null } | null;
    startDate: string;
  }>;
  taughtCourses?: Array<{ id: string; title: string; image: string | null }>;
  stats?: {
    totalPoints: number;
    totalSubmissions: number;
    assignmentsEvaluated: number;
    attendancePercentage: number | null;
  } | null;
  instructorStats?: {
    totalStudents: number;
    totalCourses: number;
    totalAssignments: number;
  } | null;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  INSTRUCTOR:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30",
  MENTOR:
    "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30",
  STUDENT:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-500/30",
  ADMIN:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-500/30",
};

const PLATFORM_ICONS: Record<
  string,
  { icon: IconType; color: string; url: (h: string) => string; label: string }
> = {
  github: {
    icon: SiGithub,
    color: "text-foreground",
    url: (h) => `https://github.com/${h}`,
    label: "GitHub",
  },
  leetcode: {
    icon: SiLeetcode,
    color: "text-amber-500",
    url: (h) => `https://leetcode.com/${h}`,
    label: "LeetCode",
  },
  codeforces: {
    icon: SiCodeforces,
    color: "text-blue-500",
    url: (h) => `https://codeforces.com/profile/${h}`,
    label: "Codeforces",
  },
  codechef: {
    icon: SiCodechef,
    color: "text-orange-700",
    url: (h) => `https://codechef.com/users/${h}`,
    label: "CodeChef",
  },
  hackerrank: {
    icon: SiHackerrank,
    color: "text-green-500",
    url: (h) => `https://hackerrank.com/profile/${h}`,
    label: "HackerRank",
  },
};

export function ProfileView({ profile }: { profile: Profile }) {
  const { data: session } = useClientSession();
  const router = useRouter();
  const utils = api.useUtils();
  const isOwnProfile = session?.user?.username === profile.username;
  const isAdmin =
    session?.user?.role === "INSTRUCTOR" || session?.user?.isAdmin;
  const isLoggedIn = !!session?.user;
  const canViewPrivate = isOwnProfile || isAdmin;

  const createDM = api.chat.createOrGetDM.useMutation({
    onSuccess: ({ groupId }) => router.push(`/community?g=${groupId}`),
    onError: () => toast.error("Could not start conversation"),
  });

  const updateProfileMutation = api.users.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("Saved");
      void utils.users.getPublicProfile.invalidate({
        username: profile.username,
      });
    },
    onError: () => toast.error("Failed to save"),
  });

  const updateExtended = api.users.updateProfileExtended.useMutation({
    onSuccess: () => {
      toast.success("Saved");
      void utils.users.getPublicProfile.invalidate({
        username: profile.username,
      });
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleProfileUpdate = async (data: any) => {
    await updateProfileMutation.mutateAsync({ profile: data });
  };

  const p = profile.profile;
  const social = (p?.socialLinks ?? {}) as SocialLinks;
  const professional = (p?.professionalProfiles ?? {}) as ProfessionalProfiles;
  const academic = (p?.academicDetails ?? {}) as AcademicDetails;
  const experiences = (p?.experiences ?? []) as Experience[];
  const skills = p?.skills ?? [];
  const projects = ((p?.metadata as any)?.projects ?? []) as Project[];
  const address = (p?.address ?? {}) as {
    city?: string;
    state?: string;
    country?: string;
  };
  const location = [address.city, address.state].filter(Boolean).join(", ");

  const roleLabel =
    profile.role.charAt(0) + profile.role.slice(1).toLowerCase();
  const roleBadgeColor =
    ROLE_BADGE_COLORS[profile.role] ?? ROLE_BADGE_COLORS.STUDENT!;

  const handleShare = () => {
    void navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  const taughtCourses = profile.taughtCourses ?? [];
  const enrolledCourses = (profile.enrolledUsers ?? []).filter(
    (eu) => eu.course,
  );

  const hasSidebar =
    isOwnProfile ||
    skills.length > 0 ||
    Object.values(professional).some(Boolean) ||
    Object.values(social).some(Boolean) ||
    !!academic.college ||
    (p?.hobbies ?? []).length > 0 ||
    !!p?.aboutMe;

  const isVerified = true;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="bg-background border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {isLoggedIn ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo-with-bg.png"
                alt="Tutly"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span className="text-foreground text-base font-semibold tracking-tight">
                Tutly
              </span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleShare}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" />
              Share
            </Button>
            {!isLoggedIn && (
              <Button size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
        <header className="bg-card overflow-hidden rounded-2xl border shadow-sm">
          <div className="from-primary/10 via-primary/5 h-20 w-full bg-gradient-to-r to-transparent sm:h-28" />
          <div className="px-4 pb-4 sm:px-7 sm:pb-7">
            <div className="-mt-10 flex flex-col gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:gap-4">
              <div className="relative w-fit flex-shrink-0 self-start">
                <div className="border-card rounded-full border-4 shadow-md">
                  <UserAvatar
                    src={profile.image}
                    name={profile.name}
                    size={96}
                  />
                </div>
                {isVerified && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          tabIndex={0}
                          className="border-card absolute right-0 bottom-1 flex h-8 w-8 cursor-help items-center justify-center rounded-full border-2 bg-blue-500 shadow-md transition-colors hover:bg-blue-600 focus-visible:outline-none"
                        >
                          <BadgeCheck
                            className="h-5 w-5 text-white"
                            strokeWidth={2.5}
                          />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-sm border-blue-500/20 bg-blue-500 text-white"
                      >
                        <div className="flex items-start gap-2 py-0.5">
                          <BadgeCheck
                            className="mt-px h-4 w-4 flex-shrink-0"
                            strokeWidth={2.5}
                          />
                          <div>
                            <p className="text-[13px] leading-tight font-semibold">
                              Verified by Tutly
                            </p>
                            <p className="mt-0.5 text-[11px] leading-snug opacity-90">
                              This is an authentic learner profile on Tutly.
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:pb-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-[28px]">
                      {profile.name}
                    </h1>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:text-[11px]",
                        roleBadgeColor,
                      )}
                    >
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs sm:text-sm">
                    @{profile.username}
                  </p>
                  {p?.headline && (
                    <p className="text-foreground/80 mt-1.5 text-sm leading-snug sm:mt-2 sm:text-[15px]">
                      {p.headline}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:mt-2 sm:text-xs">
                    {location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {format(new Date(profile.createdAt), "MMM yyyy")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  {isOwnProfile && (
                    <Button size="sm" asChild className="w-full sm:w-auto">
                      <Link href="/profile">Edit profile</Link>
                    </Button>
                  )}
                  {!isOwnProfile && isLoggedIn && (
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        createDM.mutate({ targetUserId: profile.id })
                      }
                      disabled={createDM.isPending}
                    >
                      <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                      {createDM.isPending ? "Opening…" : "Message"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {canViewPrivate && profile.stats && (
          <PrivateStatsBanner stats={profile.stats} />
        )}
        {canViewPrivate && profile.instructorStats && (
          <PrivateInstructorStatsBanner stats={profile.instructorStats} />
        )}

        <div
          className={cn(
            "mt-5 grid min-w-0 gap-5",
            hasSidebar ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "",
          )}
        >
          {hasSidebar && (
            <aside className="min-w-0 space-y-5">
              {p?.aboutMe ? (
                <Section title="About">
                  <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                    {p.aboutMe}
                  </p>
                </Section>
              ) : isOwnProfile ? (
                <AddPlaceholder
                  title="About"
                  cta="Tell people about yourself"
                  tab="personal"
                  preview={
                    <div className="space-y-1.5">
                      <GhostLine width="100%" />
                      <GhostLine width="92%" />
                      <GhostLine width="60%" />
                    </div>
                  }
                  modalTitle="About you"
                  modalDescription="A short bio shown on your public profile."
                  modal={
                    <AboutEditor
                      initial={p?.aboutMe ?? ""}
                      onSave={(v) => handleProfileUpdate({ aboutMe: v })}
                    />
                  }
                />
              ) : null}

              {skills.length > 0 ? (
                <Section title="Skills">
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="bg-accent/60 text-foreground rounded-md px-2 py-1 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </Section>
              ) : isOwnProfile ? (
                <AddPlaceholder
                  title="Skills"
                  cta="Show what you know"
                  tab="public"
                  preview={
                    <div className="flex flex-wrap gap-1.5">
                      <GhostChip width={56} />
                      <GhostChip width={72} />
                      <GhostChip width={48} />
                      <GhostChip width={64} />
                    </div>
                  }
                  modalTitle="Your skills"
                  modalDescription="Tag the technologies and tools you work with."
                  modal={
                    <SkillsEditor
                      initial={skills}
                      onSave={async (s) =>
                        await updateExtended.mutateAsync({ skills: s })
                      }
                    />
                  }
                />
              ) : null}

              {academic.branch || academic.college || academic.academicYear ? (
                <Section
                  title="Education"
                  icon={<GraduationCap className="h-4 w-4" />}
                >
                  {academic.college && (
                    <p className="text-foreground text-sm font-medium">
                      {academic.college}
                    </p>
                  )}
                  {academic.branch && (
                    <p className="text-foreground/70 mt-0.5 text-xs">
                      {academic.branch}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                    {academic.academicYear && (
                      <span className="text-muted-foreground">
                        Year {academic.academicYear}
                      </span>
                    )}
                    {canViewPrivate && academic.cgpa && (
                      <span className="text-muted-foreground">
                        · CGPA {academic.cgpa}
                      </span>
                    )}
                    {canViewPrivate && academic.section && (
                      <span className="text-muted-foreground">
                        · Section {academic.section}
                      </span>
                    )}
                  </div>
                </Section>
              ) : isOwnProfile ? (
                <AddPlaceholder
                  title="Education"
                  cta="Add your school"
                  tab="academic"
                  preview={
                    <div className="space-y-1.5">
                      <GhostLine width="80%" />
                      <GhostLine width="50%" />
                    </div>
                  }
                  modalTitle="Education"
                  modal={
                    <AcademicDetailsEditor
                      defaultEditing
                      academicDetails={
                        (academic as Record<string, string>) ?? {}
                      }
                      onUpdate={async (data) => {
                        await handleProfileUpdate(data);
                      }}
                    />
                  }
                />
              ) : null}

              {Object.values(professional).some(Boolean) ? (
                <Section title="Coding Profiles">
                  <div className="-m-1 flex flex-wrap">
                    {Object.entries(professional).map(([key, handle]) => {
                      if (!handle) return null;
                      const meta = PLATFORM_ICONS[key];
                      if (!meta) return null;
                      const Icon = meta.icon;
                      return (
                        <a
                          key={key}
                          href={meta.url(handle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${meta.label}: @${handle}`}
                          className="hover:bg-accent group m-1 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors"
                        >
                          <Icon className={cn("h-4 w-4", meta.color)} />
                          <span className="text-foreground text-xs font-medium">
                            {meta.label}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </Section>
              ) : isOwnProfile ? (
                <AddPlaceholder
                  title="Coding Profiles"
                  cta="Show your contest cred"
                  tab="professional"
                  preview={
                    <div className="flex flex-wrap gap-1.5">
                      <div className="bg-muted h-7 w-20 rounded-md" />
                      <div className="bg-muted h-7 w-24 rounded-md" />
                      <div className="bg-muted h-7 w-20 rounded-md" />
                    </div>
                  }
                  modalTitle="Coding Profiles"
                  modal={
                    <ProfessionalProfilesEditor
                      defaultEditing
                      professionalProfiles={
                        (professional as Record<string, string>) ?? {}
                      }
                      onUpdate={async (data) => {
                        await handleProfileUpdate(data);
                      }}
                    />
                  }
                />
              ) : null}

              {Object.values(social).some(Boolean) ? (
                <Section title="Links">
                  <div className="space-y-1.5">
                    {social.linkedin && (
                      <SocialRow
                        href={social.linkedin}
                        icon={<Linkedin className="h-3.5 w-3.5" />}
                        label="LinkedIn"
                      />
                    )}
                    {social.twitter && (
                      <SocialRow
                        href={social.twitter}
                        icon={<Twitter className="h-3.5 w-3.5" />}
                        label="Twitter"
                      />
                    )}
                    {social.website && (
                      <SocialRow
                        href={social.website}
                        icon={<Globe className="h-3.5 w-3.5" />}
                        label="Website"
                      />
                    )}
                    {social.facebook && (
                      <SocialRow
                        href={social.facebook}
                        icon={<ExternalLink className="h-3.5 w-3.5" />}
                        label="Facebook"
                      />
                    )}
                  </div>
                </Section>
              ) : isOwnProfile ? (
                <AddPlaceholder
                  title="Links"
                  cta="Connect your socials"
                  tab="social"
                  preview={
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Linkedin className="text-muted h-3.5 w-3.5" />
                        <GhostLine width={80} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="text-muted h-3.5 w-3.5" />
                        <GhostLine width={60} />
                      </div>
                    </div>
                  }
                  modalTitle="Social links"
                  modal={
                    <SocialLinksEditor
                      defaultEditing
                      socialLinks={(social as Record<string, string>) ?? {}}
                      onUpdate={async (data) => {
                        await handleProfileUpdate(data);
                      }}
                    />
                  }
                />
              ) : null}

              {(p?.hobbies ?? []).length > 0 && (
                <Section title="Interests">
                  <div className="flex flex-wrap gap-1.5">
                    {(p?.hobbies ?? []).map((h) => (
                      <span
                        key={h}
                        className="bg-accent/60 text-foreground rounded-md px-2 py-0.5 text-xs"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </aside>
          )}

          <div className="min-w-0 space-y-5">
            {!hasSidebar && p?.aboutMe && (
              <Section title="About">
                <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                  {p.aboutMe}
                </p>
              </Section>
            )}

            {(profile.activityHeatmap?.length ?? 0) > 0 && (
              <Section
                title={
                  profile.role === "STUDENT"
                    ? "Submission Activity"
                    : "Evaluation Activity"
                }
                icon={<Sparkles className="h-4 w-4" />}
              >
                <ActivityHeatmap
                  data={profile.activityHeatmap ?? []}
                  label={
                    profile.role === "STUDENT" ? "submissions" : "evaluations"
                  }
                />
              </Section>
            )}

            {projects.length > 0 ? (
              <Section
                title="Projects"
                icon={<FolderOpen className="h-4 w-4" />}
                count={projects.length}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {projects.map((proj, i) => (
                    <ProjectCard key={i} project={proj} />
                  ))}
                </div>
              </Section>
            ) : isOwnProfile ? (
              <AddPlaceholder
                title="Projects"
                cta="Showcase what you've built"
                tab="projects"
                preview={
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="border-border/60 bg-muted/30 space-y-1.5 rounded-lg border p-3"
                      >
                        <GhostLine width="60%" />
                        <GhostLine width="100%" />
                        <GhostLine width="80%" />
                        <div className="flex gap-1 pt-1">
                          <div className="bg-muted h-4 w-10 rounded" />
                          <div className="bg-muted h-4 w-12 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
                modalTitle="Projects"
                modalDescription="Showcase your work. Projects appear on your public profile."
                modalWide
                modal={
                  <ProjectsEditor
                    initial={projects as any}
                    onSave={async (next) => {
                      await updateProfileMutation.mutateAsync({
                        profile: {
                          metadata: {
                            ...((p?.metadata as object) ?? {}),
                            projects: next,
                          },
                        },
                      });
                    }}
                  />
                }
              />
            ) : null}

            {experiences.length > 0 ? (
              <Section
                title="Experience"
                icon={<Briefcase className="h-4 w-4" />}
              >
                <div className="space-y-4">
                  {experiences.map((exp, i) => (
                    <ExperienceItem
                      key={i}
                      exp={exp}
                      isLast={i === experiences.length - 1}
                    />
                  ))}
                </div>
              </Section>
            ) : isOwnProfile ? (
              <AddPlaceholder
                title="Experience"
                cta="Add work experience"
                tab="experience"
                preview={
                  <div className="flex gap-3">
                    <div className="bg-muted/60 h-9 w-9 flex-shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <GhostLine width="50%" />
                      <GhostLine width="35%" />
                      <GhostLine width="65%" />
                    </div>
                  </div>
                }
                modalTitle="Work experience"
                modal={
                  <ExperienceEditor
                    defaultEditing
                    experiences={experiences as Array<Record<string, any>>}
                    onUpdate={async (data) => {
                      await handleProfileUpdate(data);
                    }}
                  />
                }
              />
            ) : null}

            {(taughtCourses.length > 0 || enrolledCourses.length > 0) && (
              <Section
                title="Courses"
                icon={<BookOpen className="h-4 w-4" />}
                count={taughtCourses.length + enrolledCourses.length}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {taughtCourses.map((c, i) => (
                    <CourseRow
                      key={`t-${i}`}
                      id={c.id}
                      title={c.title}
                      image={c.image}
                      subtitle="Instructor"
                    />
                  ))}
                  {enrolledCourses.map((eu, i) => (
                    <CourseRow
                      key={`e-${i}`}
                      id={eu.course!.id}
                      title={eu.course!.title}
                      image={eu.course!.image}
                      subtitle={`Since ${format(new Date(eu.startDate), "MMM yyyy")}`}
                    />
                  ))}
                </div>
              </Section>
            )}

            {!isOwnProfile &&
              projects.length === 0 &&
              experiences.length === 0 &&
              taughtCourses.length === 0 &&
              enrolledCourses.length === 0 &&
              (profile.activityHeatmap?.length ?? 0) === 0 && (
                <div className="bg-card flex flex-col items-center justify-center gap-3 rounded-2xl border p-12 text-center shadow-sm">
                  <div className="bg-muted text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">
                      Nothing to showcase yet
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {profile.name} hasn't added portfolio details yet.
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card min-w-0 rounded-2xl border p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-foreground text-sm font-semibold tracking-tight">
          {title}
        </h2>
        {typeof count === "number" && (
          <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function PrivateStatsBanner({
  stats,
}: {
  stats: NonNullable<Profile["stats"]>;
}) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Points", value: String(stats.totalPoints) },
    { label: "Submissions", value: String(stats.totalSubmissions) },
    { label: "Evaluated", value: String(stats.assignmentsEvaluated) },
  ];
  if (stats.attendancePercentage !== null) {
    items.push({
      label: "Attendance",
      value: `${stats.attendancePercentage}%`,
    });
  }
  return (
    <div className="bg-card mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Private · Only visible to you
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-1.5">
            <span className="text-foreground text-base font-bold tabular-nums">
              {it.value}
            </span>
            <span className="text-muted-foreground text-xs">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivateInstructorStatsBanner({
  stats,
}: {
  stats: NonNullable<Profile["instructorStats"]>;
}) {
  const items = [
    { label: "Students", value: stats.totalStudents },
    { label: "Courses", value: stats.totalCourses },
    { label: "Assignments", value: stats.totalAssignments },
  ];
  return (
    <div className="bg-card mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
        Private · Only visible to you
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map((it) => (
          <div key={it.label} className="flex items-baseline gap-1.5">
            <span className="text-foreground text-base font-bold tabular-nums">
              {it.value}
            </span>
            <span className="text-muted-foreground text-xs">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CourseRow({
  id,
  title,
  image,
  subtitle,
}: {
  id: string;
  title: string;
  image: string | null;
  subtitle: string;
}) {
  const [error, setError] = useState(false);
  return (
    <Link
      href={`/courses/detail?id=${id}`}
      className="hover:bg-accent/40 hover:border-foreground/20 group flex items-center gap-3 rounded-lg border p-2.5 transition-colors"
    >
      {image && !error ? (
        <img
          src={image}
          alt={title}
          width={36}
          height={36}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
          className="h-9 w-9 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="bg-primary/10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md">
          <BookOpen className="text-primary h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground group-hover:text-primary truncate text-sm font-medium transition-colors">
          {title}
        </p>
        <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
      </div>
    </Link>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const content = (
    <div className="hover:border-foreground/20 hover:bg-accent/40 group flex h-full flex-col rounded-xl border p-4 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-foreground group-hover:text-primary text-sm font-semibold transition-colors">
          {project.title ?? "Untitled Project"}
        </p>
        {project.url && (
          <Link2 className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 flex-shrink-0 transition-colors" />
        )}
      </div>
      {project.description && (
        <p className="text-foreground/70 mt-1.5 line-clamp-3 text-xs leading-relaxed">
          {project.description}
        </p>
      )}
      {project.techStack && project.techStack.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-3">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className="bg-muted text-foreground/70 rounded px-1.5 py-0.5 text-[10px] font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (project.url) {
    return (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        {content}
      </a>
    );
  }
  return content;
}

function ExperienceItem({ exp, isLast }: { exp: Experience; isLast: boolean }) {
  const start = exp.startDate ? new Date(exp.startDate) : null;
  const end = exp.endDate ? new Date(exp.endDate) : null;
  const now = new Date();

  let duration = "";
  if (start) {
    const endDate = end ?? now;
    const months = differenceInMonths(endDate, start);
    if (months < 12) {
      duration = `${months} mo`;
    } else {
      const years = differenceInYears(endDate, start);
      const remainingMonths = months - years * 12;
      duration =
        remainingMonths > 0
          ? `${years} yr ${remainingMonths} mo`
          : `${years} yr`;
    }
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-shrink-0 flex-col items-center">
        <div className="bg-accent flex h-9 w-9 items-center justify-center rounded-md">
          <Briefcase className="text-foreground/70 h-4 w-4" />
        </div>
        {!isLast && <div className="bg-border mt-1 w-px flex-1" />}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-foreground text-sm font-semibold">
          {exp.role ?? "Role"}
        </p>
        <p className="text-foreground/70 text-sm">{exp.company}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          {start && (
            <span>
              {format(start, "MMM yyyy")} –{" "}
              {end ? format(end, "MMM yyyy") : "Present"}
              {duration && ` · ${duration}`}
            </span>
          )}
          {(exp.workCity || exp.workLocation) && (
            <span>· {exp.workCity ?? exp.workLocation}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  data,
  label,
}: {
  data: ActivityDay[];
  label: string;
}) {
  const [hover, setHover] = useState<{
    date: Date;
    count: number;
    left: number;
    top: number;
  } | null>(null);

  const counts = new Map(data.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yearAgo = new Date(today);
  yearAgo.setDate(yearAgo.getDate() - 364);

  const start = new Date(yearAgo);
  while (start.getDay() !== 0) start.setDate(start.getDate() - 1);

  const weeks: Array<Array<{ date: Date; count: number; inRange: boolean }>> =
    [];
  const cursor = new Date(start);

  while (cursor <= today) {
    const week: Array<{ date: Date; count: number; inRange: boolean }> = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(cursor);
      const inRange = day >= yearAgo && day <= today;
      const key = day.toISOString().slice(0, 10);
      week.push({ date: day, count: counts.get(key) ?? 0, inRange });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;
  const max = Math.max(1, ...data.map((d) => d.count));

  const longestStreak = (() => {
    let best = 0;
    let curr = 0;
    for (const week of weeks) {
      for (const d of week) {
        if (!d.inRange) continue;
        if (d.count > 0) {
          curr += 1;
          best = Math.max(best, curr);
        } else {
          curr = 0;
        }
      }
    }
    return best;
  })();

  const colorFor = (count: number) => {
    if (count === 0) return "bg-muted";
    const ratio = count / max;
    if (ratio <= 0.25) return "bg-emerald-200 dark:bg-emerald-900";
    if (ratio <= 0.5) return "bg-emerald-400 dark:bg-emerald-700";
    if (ratio <= 0.75) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  const allMonthStarts: Array<{ index: number; label: string }> = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const firstInRange = week.find((d) => d.inRange);
    if (!firstInRange) return;
    const m = firstInRange.date.getMonth();
    if (m !== lastMonth) {
      allMonthStarts.push({
        index: i,
        label: firstInRange.date.toLocaleDateString("en-US", {
          month: "short",
        }),
      });
      lastMonth = m;
    }
  });
  // Drop a month label if there isn't enough space before the next one.
  const monthLabels = allMonthStarts.filter((m, i) => {
    const next = allMonthStarts[i + 1];
    return !next || next.index - m.index >= 3;
  });

  const totalCols = weeks.length;
  const singularLabel = label.replace(/s$/, "");

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:mb-4 sm:gap-x-5">
        <p className="text-foreground text-xs sm:text-sm">
          <span className="text-base font-bold tabular-nums sm:text-lg">
            {total}
          </span>{" "}
          <span className="text-muted-foreground">
            {label} in the last year
          </span>
        </p>
        <p className="text-muted-foreground text-[11px] sm:text-xs">
          <span className="text-foreground font-semibold tabular-nums">
            {activeDays}
          </span>{" "}
          active days
        </p>
        {longestStreak > 1 && (
          <p className="text-muted-foreground text-[11px] sm:text-xs">
            <span className="text-foreground font-semibold tabular-nums">
              {longestStreak}
            </span>{" "}
            day streak
          </p>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div
          data-heatmap
          className="relative min-w-[640px] sm:w-full sm:min-w-0"
        >
          <div className="flex w-full items-stretch gap-2">
            <div className="text-muted-foreground flex w-6 flex-shrink-0 flex-col justify-around pt-4 text-[9px]">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="relative mb-1 grid h-3 w-full"
                style={{
                  gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
                  columnGap: "3px",
                }}
              >
                {weeks.map((_, i) => {
                  const m = monthLabels.find((ml) => ml.index === i);
                  return (
                    <span
                      key={i}
                      className="text-muted-foreground overflow-visible text-[10px] whitespace-nowrap"
                    >
                      {m?.label ?? ""}
                    </span>
                  );
                })}
              </div>

              <div
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))`,
                  columnGap: "3px",
                }}
              >
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-rows-7 gap-[3px]">
                    {week.map((day, di) => (
                      <div
                        key={di}
                        onMouseEnter={(e) => {
                          if (!day.inRange || day.count === 0) return;
                          const cell = e.currentTarget;
                          const wrapper = cell.closest(
                            "[data-heatmap]",
                          ) as HTMLElement | null;
                          if (!wrapper) return;
                          const cellRect = cell.getBoundingClientRect();
                          const wrapperRect = wrapper.getBoundingClientRect();
                          setHover({
                            date: day.date,
                            count: day.count,
                            left:
                              cellRect.left -
                              wrapperRect.left +
                              cellRect.width / 2,
                            top: cellRect.top - wrapperRect.top,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                        className={cn(
                          "aspect-square rounded-[2px] transition-transform",
                          day.inRange ? colorFor(day.count) : "bg-transparent",
                          day.inRange &&
                            day.count > 0 &&
                            "cursor-pointer hover:scale-125 hover:ring-1 hover:ring-emerald-500",
                        )}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            {hover && (
              <div
                className="bg-foreground text-background absolute z-20 -translate-x-1/2 -translate-y-full rounded-md px-2 py-1 text-xs whitespace-nowrap shadow-lg"
                style={{ left: hover.left, top: hover.top - 6 }}
              >
                <span className="font-bold tabular-nums">{hover.count}</span>{" "}
                {hover.count === 1 ? singularLabel : label} ·{" "}
                {hover.date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex items-center justify-end gap-1.5 text-[10px]">
        <span>Less</span>
        <div className="bg-muted h-[10px] w-[10px] rounded-[2px]" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-500 dark:bg-emerald-600" />
        <div className="h-[10px] w-[10px] rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
        <span>More</span>
      </div>
    </div>
  );
}

function PlaceholderShell({
  title,
  cta,
  preview,
  className,
}: {
  title: string;
  cta: string;
  preview: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border group-hover:border-primary/40 group-hover:bg-primary/[0.03] rounded-2xl border border-dashed p-4 text-left transition-colors sm:p-5",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground/80 group-hover:text-foreground/80 text-sm font-semibold tracking-tight transition-colors">
          {title}
        </h2>
        <span className="text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground bg-muted flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors">
          <Plus className="h-3 w-3" />
        </span>
      </div>
      <div className="opacity-60 transition-opacity group-hover:opacity-90">
        {preview}
      </div>
      <p className="text-primary mt-3 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100">
        {cta} →
      </p>
    </div>
  );
}

function AddPlaceholder({
  title,
  cta,
  tab,
  preview,
  className,
  modal,
  modalTitle,
  modalDescription,
  modalWide,
}: {
  title: string;
  cta: string;
  tab: string;
  preview: React.ReactNode;
  className?: string;
  modal?: React.ReactNode;
  modalTitle?: string;
  modalDescription?: string;
  modalWide?: boolean;
}) {
  if (modal) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group block w-full cursor-pointer text-left"
          >
            <PlaceholderShell
              title={title}
              cta={cta}
              preview={preview}
              className={className}
            />
          </button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto",
            modalWide ? "sm:max-w-3xl" : "max-w-2xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>{modalTitle ?? title}</DialogTitle>
            {modalDescription && (
              <DialogDescription>{modalDescription}</DialogDescription>
            )}
          </DialogHeader>
          {modal}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Link href={`/profile?tab=${tab}`} className="group block cursor-pointer">
      <PlaceholderShell
        title={title}
        cta={cta}
        preview={preview}
        className={className}
      />
    </Link>
  );
}

function AboutEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Write a short bio about yourself, your interests, what you're learning…"
        rows={6}
        maxLength={500}
        className="resize-none"
      />
      <p className="text-muted-foreground text-right text-[10px]">
        {value.length}/500
      </p>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(value.trim());
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function SkillsEditor({
  initial,
  onSave,
}: {
  initial: string[];
  onSave: (skills: string[]) => Promise<void> | void;
}) {
  const [skills, setSkills] = useState<string[]>(initial);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const add = () => {
    const v = input.trim();
    if (!v || skills.includes(v) || skills.length >= 30) return;
    setSkills([...skills, v]);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. React, Python, Figma"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button size="sm" onClick={add} disabled={!input.trim()}>
          Add
        </Button>
      </div>
      {skills.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Press Enter or comma to add a skill. Add up to 30.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <span
              key={s}
              className="bg-accent text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium"
            >
              {s}
              <button
                type="button"
                onClick={() => setSkills(skills.filter((x) => x !== s))}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3 rotate-45" />
              </button>
            </span>
          ))}
        </div>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(skills);
              setSaving(false);
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogClose>
      </DialogFooter>
    </div>
  );
}

function GhostChip({ width = 60 }: { width?: number }) {
  return (
    <div className="bg-muted h-6 rounded-md" style={{ width: `${width}px` }} />
  );
}

function GhostLine({ width = "100%" }: { width?: string | number }) {
  return (
    <div
      className="bg-muted h-2.5 rounded"
      style={{ width: typeof width === "number" ? `${width}px` : width }}
    />
  );
}

function SocialRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:text-primary flex items-center gap-2 text-xs font-medium transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
      <ExternalLink className="ml-auto h-3 w-3 opacity-40" />
    </a>
  );
}
