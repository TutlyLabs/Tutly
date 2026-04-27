"use client";

import type { Profile } from "@tutly/db/browser";
import { FileType } from "@tutly/db/browser";
import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Briefcase,
  Camera,
  Files,
  Globe,
  Home,
  IdCard,
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
  FolderOpen,
  Plus,
  Trash2,
  Link2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@tutly/ui/avatar";
import { Badge } from "@tutly/ui/badge";
import { Button } from "@tutly/ui/button";
import { Card } from "@tutly/ui/card";
import { Input } from "@tutly/ui/input";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { Switch } from "@tutly/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import { Textarea } from "@tutly/ui/textarea";
import { useFileUpload } from "@/components/useFileUpload";
import { api } from "@/trpc/react";
import Link from "next/link";

import AcademicDetails from "./AcademicDetails";
import Address from "./Address";
import BasicDetails from "./BasicDetails";
import Documents from "./Documents";
import Experience from "./Experience";
import PersonalDetails from "./PersonalDetails";
import ProfessionalProfiles from "./ProfessionalProfiles";
import { ProjectsEditor } from "./ProjectsEditor";
import SocialLinks from "./SocialLinks";

const TABS = [
  { value: "public", label: "Public Profile", icon: Sparkles },
  { value: "basic", label: "Basic", icon: IdCard },
  { value: "personal", label: "Personal", icon: UserIcon },
  { value: "professional", label: "Professional", icon: Briefcase },
  { value: "address", label: "Address", icon: Home },
  { value: "academic", label: "Academic", icon: BookOpen },
  { value: "social", label: "Social", icon: Globe },
  { value: "experience", label: "Experience", icon: Briefcase },
  { value: "projects", label: "Projects", icon: FolderOpen },
  { value: "documents", label: "Documents", icon: Files },
];

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface CompletenessItem {
  label: string;
  done: boolean;
  points: number;
  tab?: string;
}

function computeCompleteness(opts: {
  avatar: string;
  headline: string;
  skills: string[];
  profile: any;
  projects: any[];
}): { percentage: number; items: CompletenessItem[] } {
  const { avatar, headline, skills, profile, projects } = opts;
  const items: CompletenessItem[] = [
    {
      label: "Profile photo",
      done: !!avatar && avatar !== "/placeholder.jpg",
      points: 15,
      tab: "basic",
    },
    { label: "Headline", done: !!headline?.trim(), points: 15, tab: "public" },
    {
      label: "About me",
      done: !!profile?.aboutMe?.trim(),
      points: 10,
      tab: "personal",
    },
    {
      label: "Skills (3+)",
      done: skills.length >= 3,
      points: 10,
      tab: "public",
    },
    {
      label: "Phone number",
      done: !!profile?.mobile?.trim(),
      points: 5,
      tab: "basic",
    },
    {
      label: "Academic details",
      done: !!(
        profile?.academicDetails?.college || profile?.academicDetails?.branch
      ),
      points: 10,
      tab: "academic",
    },
    {
      label: "Coding profiles",
      done: !!(
        profile?.professionalProfiles &&
        Object.values(profile.professionalProfiles).some(Boolean)
      ),
      points: 10,
      tab: "professional",
    },
    {
      label: "Social links",
      done: !!(
        profile?.socialLinks && Object.values(profile.socialLinks).some(Boolean)
      ),
      points: 5,
      tab: "social",
    },
    {
      label: "Experience",
      done: !!(profile?.experiences?.length > 0),
      points: 5,
      tab: "experience",
    },
    {
      label: "Portfolio project",
      done: projects.length > 0,
      points: 5,
      tab: "projects",
    },
    {
      label: "Date of birth",
      done: !!profile?.dateOfBirth,
      points: 5,
      tab: "personal",
    },
    {
      label: "Address",
      done: !!(profile?.address?.city || profile?.address?.state),
      points: 5,
      tab: "address",
    },
  ];
  const total = items.reduce((s, i) => s + i.points, 0);
  const earned = items.filter((i) => i.done).reduce((s, i) => s + i.points, 0);
  return { percentage: Math.round((earned / total) * 100), items };
}

export default function ProfilePage({ userProfile }: { userProfile?: any }) {
  const [profile, setProfile] = useState(userProfile?.profile);
  const [avatar, setAvatar] = useState<string>(
    userProfile?.image ?? "/placeholder.jpg",
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Active tab for controlled navigation from completeness hints + ?tab= query
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "public";
    const t = new URLSearchParams(window.location.search).get("tab");
    return t && TABS.some((x) => x.value === t) ? t : "public";
  });

  // Headline + skills state
  const [headline, setHeadline] = useState<string>(profile?.headline ?? "");
  const [skillsInput, setSkillsInput] = useState<string>("");
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [isPublic, setIsPublic] = useState<boolean>(
    userProfile?.isProfilePublic ?? true,
  );
  const [copied, setCopied] = useState(false);

  // Projects state
  type Project = {
    title: string;
    description: string;
    url: string;
    techStack: string[];
  };
  const [projects, setProjects] = useState<Project[]>(
    (profile?.metadata as any)?.projects ?? [],
  );
  const [isSavingProjects, setIsSavingProjects] = useState(false);

  const copyProfileLink = () => {
    const url = `${window.location.origin}/u/${userProfile?.username}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { mutate: updateExtended, isPending: isSavingExtended } =
    api.users.updateProfileExtended.useMutation({
      onSuccess: () => toast.success("Public profile saved"),
      onError: () => toast.error("Failed to save"),
    });

  const { mutate: updateMetadata } = api.users.updateUserProfile.useMutation({
    onSuccess: () => {
      toast.success("Projects saved");
      setIsSavingProjects(false);
    },
    onError: () => {
      toast.error("Failed to save projects");
      setIsSavingProjects(false);
    },
  });

  const saveProjectsList = async (next: typeof projects) => {
    setIsSavingProjects(true);
    updateMetadata({
      profile: {
        metadata: { ...((profile?.metadata as object) ?? {}), projects: next },
      },
    });
  };

  const { mutate: setProfilePublic } = api.users.setProfilePublic.useMutation({
    onSuccess: (data) => {
      setIsPublic(data.isProfilePublic);
      toast.success(
        data.isProfilePublic
          ? "Profile is now public"
          : "Profile is now private",
      );
    },
    onError: () => toast.error("Failed to update visibility"),
  });

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = skillsInput.trim().replace(/,$/, "");
      if (val && !skills.includes(val) && skills.length < 30) {
        setSkills((prev) => [...prev, val]);
      }
      setSkillsInput("");
    }
  };

  const removeSkill = (s: string) =>
    setSkills((prev) => prev.filter((x) => x !== s));

  const { mutate: updateProfile } = api.users.updateUserProfile.useMutation({
    onSuccess: (data) => {
      setProfile(data as Profile);
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const { mutate: updateAvatar } = api.users.updateUserAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile picture updated");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile picture");
    },
  });

  const { uploadFile } = useFileUpload({
    fileType: FileType.AVATAR,
    onUpload: async (file) => {
      if (!file?.publicUrl) return;
      setAvatar(file.publicUrl);
      updateAvatar({ avatar: file.publicUrl });
    },
  });

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      if (!file) return;
      await uploadFile(file);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async (updatedFields: any) => {
    try {
      updateProfile({ profile: updatedFields });
    } catch (error) {
      console.error(error);
    }
  };

  const name = userProfile?.name ?? userProfile?.username ?? "Profile";
  const email = userProfile?.email ?? "";
  const mobile = profile?.mobile ?? "";
  const role =
    typeof userProfile?.role === "string"
      ? userProfile.role
      : userProfile?.role?.name;

  const completeness = computeCompleteness({
    avatar,
    headline,
    skills,
    profile,
    projects,
  });
  const incomplete = completeness.items.filter((i) => !i.done);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      {/* Identity hero */}
      <Card className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="from-primary/15 via-primary/5 h-20 bg-gradient-to-r to-transparent sm:h-24" />
        <div className="-mt-10 flex flex-col items-start gap-4 px-4 pb-4 sm:-mt-12 sm:flex-row sm:items-end sm:gap-5 sm:px-6 sm:pb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="group focus-visible:ring-ring relative shrink-0 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="Change profile picture"
          >
            <Avatar className="ring-background size-20 rounded-full ring-4 sm:size-24">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="text-lg font-semibold">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="bg-foreground/55 absolute inset-0 flex items-center justify-center rounded-full opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {name}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {role && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase">
                  {role}
                </span>
              )}
              {email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="max-w-[16rem] truncate">{email}</span>
                </span>
              )}
              {mobile && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {mobile}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end pb-1 sm:pb-0">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={copyProfileLink}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Share"}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={`/u/${userProfile?.username}`} target="_blank">
                <ExternalLink className="h-3.5 w-3.5" />
                View Profile
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile completeness */}
        {completeness.percentage < 100 && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-foreground text-xs font-medium">
                Profile strength
              </span>
              <span className="text-primary text-xs font-semibold">
                {completeness.percentage}%
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div
                className="from-primary to-primary/70 h-full rounded-full bg-gradient-to-r transition-all duration-500"
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            {incomplete.length > 0 && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Complete:{" "}
                {incomplete.slice(0, 3).map((i, idx) => (
                  <span key={i.label}>
                    {idx > 0 && ", "}
                    {i.tab ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab(i.tab!)}
                        className="text-primary font-medium hover:underline"
                      >
                        {i.label}
                      </button>
                    ) : (
                      <span className="text-foreground/70 font-medium">
                        {i.label}
                      </span>
                    )}
                  </span>
                ))}
                {incomplete.length > 3 && (
                  <span> +{incomplete.length - 3} more</span>
                )}
              </p>
            )}
          </div>
        )}
        {completeness.percentage === 100 && (
          <div className="px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <div className="rounded-full bg-emerald-100 p-1 dark:bg-emerald-900/30">
                <Check className="h-3 w-3" />
              </div>
              <span className="text-xs font-medium">Profile complete!</span>
            </div>
          </div>
        )}
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <ScrollArea className="-mx-3 sm:mx-0">
          <TabsList className="bg-muted/40 mx-3 inline-flex h-10 w-max items-center gap-1 rounded-lg p-1 sm:mx-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-all data-[state=active]:shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>

        <TabsContent value="public">
          <Card className="bg-card space-y-6 rounded-xl border p-4 shadow-sm sm:p-6">
            <div>
              <h3 className="text-foreground mb-1 text-sm font-semibold">
                Headline
              </h3>
              <p className="text-muted-foreground mb-2 text-xs">
                A short line that appears under your name on your public
                profile.
              </p>
              <Input
                placeholder="e.g. Full-Stack Developer · Open to work"
                maxLength={120}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
              />
            </div>

            <div>
              <h3 className="text-foreground mb-1 text-sm font-semibold">
                Skills
              </h3>
              <p className="text-muted-foreground mb-2 text-xs">
                Press Enter or comma to add. Up to 30 skills.
              </p>
              <div className="mb-2 flex flex-wrap gap-2">
                {skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:text-destructive ml-0.5 rounded-sm"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="React, Node.js, Python…"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                onKeyDown={handleAddSkill}
                disabled={skills.length >= 30}
              />
            </div>

            <div className="bg-accent/30 flex items-center gap-2 rounded-lg border px-4 py-3">
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">
                  Profile Visibility
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {isPublic
                    ? "Your profile is public — anyone with the link can view it."
                    : "Your profile is private — only you can view it."}
                </p>
              </div>
              <Switch
                checked={isPublic}
                onCheckedChange={(checked) =>
                  setProfilePublic({ isPublic: checked })
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                onClick={() => updateExtended({ headline, skills })}
                disabled={isSavingExtended}
              >
                {isSavingExtended ? "Saving…" : "Save Public Profile"}
              </Button>
              <Button asChild variant="outline">
                <Link
                  href={`/u/${userProfile?.username}`}
                  target="_blank"
                  className="gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={copyProfileLink}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="basic">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <BasicDetails
              defaultEditing={
                !profile?.mobile?.trim() &&
                !profile?.whatsapp?.trim() &&
                !profile?.gender?.trim()
              }
              email={userProfile?.email || ""}
              secondaryEmail={profile?.secondaryEmail || ""}
              mobile={profile?.mobile || ""}
              whatsapp={profile?.whatsapp || ""}
              gender={profile?.gender || ""}
              tshirtSize={profile?.tshirtSize || ""}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <PersonalDetails
              defaultEditing={
                !profile?.aboutMe?.trim() &&
                !(profile?.hobbies?.length ?? 0) &&
                !profile?.dateOfBirth
              }
              dateOfBirth={profile?.dateOfBirth as Date}
              hobbies={profile?.hobbies || []}
              aboutMe={profile?.aboutMe || ""}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <ProfessionalProfiles
              defaultEditing={
                !Object.values(
                  (profile?.professionalProfiles as Record<string, string>) ??
                    {},
                ).some(Boolean)
              }
              professionalProfiles={
                profile?.professionalProfiles as Record<string, string>
              }
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <Address
              defaultEditing={
                !Object.values(
                  (profile?.address as Record<string, string>) ?? {},
                ).some(Boolean)
              }
              address={profile?.address as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <AcademicDetails
              defaultEditing={
                !Object.values(
                  (profile?.academicDetails as Record<string, string>) ?? {},
                ).some(Boolean)
              }
              academicDetails={
                profile?.academicDetails as Record<string, string>
              }
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <Experience
              defaultEditing={
                !((profile?.experiences as any[] | undefined)?.length ?? 0)
              }
              experiences={profile?.experiences as Array<Record<string, any>>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <SocialLinks
              defaultEditing={
                !Object.values(
                  (profile?.socialLinks as Record<string, string>) ?? {},
                ).some(Boolean)
              }
              socialLinks={profile?.socialLinks as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <ProjectsEditor
              initial={projects}
              isSaving={isSavingProjects}
              onSave={async (next) => {
                setProjects(next);
                await saveProjectsList(next);
              }}
            />
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <Documents
              documents={profile?.documents as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
