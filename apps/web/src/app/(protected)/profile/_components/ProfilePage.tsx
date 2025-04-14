"use client"

import type { Profile, User } from "@prisma/client";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
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
    <div className="p-3 md:p-6">

      <Tabs defaultValue="basic" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="mb-2 w-max min-w-full md:grid md:grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="basic" className="text-sm md:text-base">Basic Details</TabsTrigger>
            <TabsTrigger value="personal" className="text-sm md:text-base">Personal</TabsTrigger>
            <TabsTrigger value="professional" className="text-sm md:text-base">Professional</TabsTrigger>
            <TabsTrigger value="address" className="text-sm md:text-base">Address</TabsTrigger>
            <TabsTrigger value="academic" className="text-sm md:text-base">Academic</TabsTrigger>
            <TabsTrigger value="social" className="text-sm md:text-base">Social</TabsTrigger>
            <TabsTrigger value="experience" className="text-sm md:text-base">Experience</TabsTrigger>
            <TabsTrigger value="documents" className="text-sm md:text-base">Documents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="basic">
          <Card className="p-3 md:p-6">
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
          </Card>
        </TabsContent>

        <TabsContent value="personal">
          <Card className="p-3 md:p-6">
            <PersonalDetails
              dateOfBirth={profile?.dateOfBirth as Date}
              hobbies={profile?.hobbies || []}
              aboutMe={profile?.aboutMe || ""}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="professional">
          <Card className="p-3 md:p-6">
            <ProfessionalProfiles
              professionalProfiles={profile?.professionalProfiles as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="address">
          <Card className="p-3 md:p-6">
            <Address
              address={profile?.address as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="academic">
          <Card className="p-3 md:p-6">
            <AcademicDetails
              academicDetails={profile?.academicDetails as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="experience">
          <Card className="p-3 md:p-6">
            <Experience
              experiences={profile?.experiences as Array<Record<string, any>>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card className="p-3 md:p-6">
            <SocialLinks
              socialLinks={profile?.socialLinks as Record<string, string>}
              onUpdate={handleUpdateProfile}
            />
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="p-3 md:p-6">
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