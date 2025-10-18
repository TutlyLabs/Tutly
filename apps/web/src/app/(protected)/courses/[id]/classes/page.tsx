import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function ClassesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession();
  if (!session?.user) return redirect("/sign-in");

  const { id } = await params;
  const search = await searchParams;

  const latestClass = await db.class.findFirst({
    where: {
      courseId: id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const urlParams = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => urlParams.append(key, v));
      } else {
        urlParams.set(key, value);
      }
    }
  });
  const queryString = urlParams.toString();

  if (latestClass) {
    const redirectUrl = queryString
      ? `/courses/${id}/classes/${latestClass.id}?${queryString}`
      : `/courses/${id}/classes/${latestClass.id}`;
    return redirect(redirectUrl);
  }

  const fallbackUrl = queryString
    ? `/courses/${id}?${queryString}`
    : `/courses/${id}`;
  return redirect(fallbackUrl);
}
