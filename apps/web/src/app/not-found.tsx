import Link from "next/link";
import NoDataFound from "@/components/NoDataFound";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <NoDataFound message="Page not found" />
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 rounded-md px-4 py-2"
      >
        Return to Home
      </Link>
    </div>
  );
}
