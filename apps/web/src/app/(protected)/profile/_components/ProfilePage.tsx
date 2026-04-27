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
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@tutly/ui/avatar";
import { Card } from "@tutly/ui/card";
import { ScrollArea, ScrollBar } from "@tutly/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tutly/ui/tabs";
import { useFileUpload } from "@/components/useFileUpload";
import { api } from "@/trpc/react";

import AcademicDetails from "./AcademicDetails";
import Address from "./Address";
import BasicDetails from "./BasicDetails";
import Documents from "./Documents";
import Experience from "./Experience";
import PersonalDetails from "./PersonalDetails";
import ProfessionalProfiles from "./ProfessionalProfiles";
import SocialLinks from "./SocialLinks";

const TABS = [
  { value: "basic", label: "Basic", icon: IdCard },
  { value: "personal", label: "Personal", icon: UserIcon },
  { value: "professional", label: "Professional", icon: Briefcase },
  { value: "address", label: "Address", icon: Home },
  { value: "academic", label: "Academic", icon: BookOpen },
  { value: "social", label: "Social", icon: Globe },
  { value: "experience", label: "Experience", icon: Briefcase },
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

export default function ProfilePage({ userProfile }: { userProfile?: any }) {
  const [profile, setProfile] = useState(userProfile?.profile);
  const [avatar, setAvatar] = useState<string>(
    userProfile?.image ?? "/placeholder.jpg",
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
            className="group relative shrink-0 cursor-pointer rounded-full focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
        </div>
      </Card>

      <Tabs defaultValue="basic" className="space-y-4">
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

        <TabsContent value="basic">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <BasicDetails
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
              address={profile?.address as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <AcademicDetails
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
              experiences={profile?.experiences as Array<Record<string, any>>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="bg-card rounded-xl border p-4 shadow-sm sm:p-6">
            <SocialLinks
              socialLinks={profile?.socialLinks as Record<string, string>}
              onUpdate={handleUpdateProfile}
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
