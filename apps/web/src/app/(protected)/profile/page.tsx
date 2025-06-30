"use client";

import { api } from "@/trpc/react";
import ProfilePage from "./_components/ProfilePage";
import type { Profile } from "@tutly/api/schema";

export default function Profile() {
  const userProfile = api.users.getUserProfile.useQuery();

  return <ProfilePage userProfile={userProfile.data} />;
}
