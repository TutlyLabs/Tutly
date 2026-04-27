import { Sparkles } from "lucide-react";

export default function LeaderboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
        <Sparkles className="h-6 w-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Coming soon
        </h1>
        <p className="text-muted-foreground text-sm">
          We're working on a unified coding platforms leaderboard. Hang tight.
        </p>
      </div>
    </div>
  );
}
