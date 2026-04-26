"use client";

import PageLoader from "@/components/loader/PageLoader";
import { api } from "@/trpc/react";
import ProfilePage from "./_components/ProfilePage";

export default function Profile() {
  const q = api.users.getUserProfile.useQuery();
  if (q.isLoading) return <PageLoader />;
  return <ProfilePage userProfile={q.data} />;
}
