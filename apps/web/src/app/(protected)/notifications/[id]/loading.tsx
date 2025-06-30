export default function Loading() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Redirecting...</h1>
        <p className="text-muted-foreground text-xl">
          Please wait while we redirect you.
        </p>
      </div>
    </div>
  );
}
