import Link from "next/link";
import NoDataFound from "@/components/NoDataFound";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Link
        href="/"
        className="mt-8 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Return to Home
      </Link>
    </div>
  );
} 