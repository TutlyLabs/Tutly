import { api } from "@/trpc/server";
import ProfilePage from "./_components/ProfilePage";
import type { Profile } from "@/lib/prisma";

export default async function Profile() {
  const userProfile = await api.users.getUserProfile();

  return <ProfilePage userProfile={userProfile} />;
}
