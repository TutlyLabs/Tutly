import { api } from "@/trpc/server";
import ProfilePage from "./_components/ProfilePage";
import type { Profile } from "@prisma/client";

export default async function Profile() {
  const userProfile = await api.users.getUserProfile();

  return <ProfilePage userProfile={userProfile} />;
}
