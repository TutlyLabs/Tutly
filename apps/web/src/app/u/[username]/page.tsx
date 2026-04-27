import type { Metadata } from "next";
import { api } from "@/trpc/server";
import { ProfileViewClient } from "./_components/ProfileViewClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await api.users
    .getPublicProfile({ username })
    .catch(() => null);

  if (!profile || "isPrivate" in profile) {
    return {
      title: `@${username} · Tutly`,
      description: "This profile is private.",
    };
  }

  const p = profile as any;
  const headline = p.profile?.headline;
  const description = headline
    ? `${headline} · ${p.role.charAt(0)}${p.role.slice(1).toLowerCase()} at Tutly`
    : `${p.role.charAt(0)}${p.role.slice(1).toLowerCase()} at Tutly`;

  return {
    title: `${p.name} (@${username}) · Tutly`,
    description,
    openGraph: {
      title: `${p.name} · Tutly`,
      description,
      images: [
        { url: p.image ?? "/logo-with-bg.png", width: 400, height: 400 },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${p.name} (@${username}) · Tutly`,
      description,
      images: [p.image ?? "/logo-with-bg.png"],
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <ProfileViewClient username={username} />;
}
