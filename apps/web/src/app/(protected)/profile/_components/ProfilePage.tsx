"use client"

import type { Profile, User } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

import AcademicDetails from "./AcademicDetails";
import Address from "./Address";
import BasicDetails from "./BasicDetails";
import Documents from "./Documents";
import Experience from "./Experience";
import PersonalDetails from "./PersonalDetails";
import ProfessionalProfiles from "./ProfessionalProfiles";
import SocialLinks from "./SocialLinks";

type UserWithProfile = User & {
  profile: Profile | null;
};

export default function ProfilePage({ userProfile }: { userProfile: UserWithProfile }) {
  const [profile, setProfile] = useState(userProfile.profile);

  const { mutate: updateProfile } = api.users.updateUserProfile.useMutation({
    onSuccess: (data) => {
      setProfile(data as Profile);
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleUpdateProfile = async (updatedFields: any) => {
    try {
      updateProfile({
        profile: updatedFields,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto px-2 py-4 sm:px-4 sm:py-6 md:px-6">
      <h1 className="mb-4 text-xl font-bold text-foreground sm:text-2xl md:mb-6 md:text-3xl">Profile</h1>

      <Tabs defaultValue="basic" className="w-full">
        <div className="mb-4 sm:mb-6">
          <TabsList className="h-auto w-full rounded-md bg-muted/60 p-1">
            <div className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
              <TabsTrigger 
                value="basic" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Basic
              </TabsTrigger>
              <TabsTrigger 
                value="personal" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Personal
              </TabsTrigger>
              <TabsTrigger 
                value="professional" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Professional
              </TabsTrigger>
              <TabsTrigger 
                value="address" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Address
              </TabsTrigger>
              <TabsTrigger 
                value="academic" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Academic
              </TabsTrigger>
              <TabsTrigger 
                value="social" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Social
              </TabsTrigger>
              <TabsTrigger 
                value="experience" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Experience
              </TabsTrigger>
              <TabsTrigger 
                value="documents" 
                className="rounded-sm py-1.5 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:py-2 sm:text-sm md:text-base"
              >
                Documents
              </TabsTrigger>
            </div>
          </TabsList>
        </div>

        <TabsContent value="basic" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <BasicDetails
                avatar={userProfile?.image || ""}
                email={userProfile?.email || ""}
                secondaryEmail={profile?.secondaryEmail || ""}
                mobile={profile?.mobile || ""}
                whatsapp={profile?.whatsapp || ""}
                gender={profile?.gender || ""}
                tshirtSize={profile?.tshirtSize || ""}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <PersonalDetails
                dateOfBirth={profile?.dateOfBirth as Date}
                hobbies={profile?.hobbies || []}
                aboutMe={profile?.aboutMe || ""}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <ProfessionalProfiles
                professionalProfiles={profile?.professionalProfiles as Record<string, string>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <Address
                address={profile?.address as Record<string, string>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academic" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <AcademicDetails
                academicDetails={profile?.academicDetails as Record<string, string>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <Experience
                experiences={profile?.experiences as Array<Record<string, any>>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <SocialLinks
                socialLinks={profile?.socialLinks as Record<string, string>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
          <Card className="overflow-hidden border border-border bg-card text-card-foreground shadow-sm">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <Documents
                documents={profile?.documents as Record<string, string>}
                onUpdate={handleUpdateProfile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}