import { api } from "@/trpc/react";
import ProfilePage from "./_components/ProfilePage";
import type { Profile } from "@prisma/client";

export default function Profile() {
  const userProfile = api.users.getUserProfile.useQuery();

  if (!userProfile) {
    return <div>User not found</div>;
  }

  return <ProfilePage userProfile={userProfile.data!} />;
} 