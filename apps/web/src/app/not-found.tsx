import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="bg-primary/10 text-primary mb-5 flex h-16 w-16 items-center justify-center rounded-2xl">
        <Compass className="h-7 w-7" />
      </div>
      <h1 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-center text-sm sm:text-base">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors"
        >
          Return home
        </Link>
        <Link
          href="/dashboard"
          className="bg-card hover:bg-accent text-foreground inline-flex h-10 items-center justify-center rounded-md border px-5 text-sm font-medium transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
