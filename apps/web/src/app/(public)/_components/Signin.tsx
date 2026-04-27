"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@tutly/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@tutly/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@tutly/ui/form";
import { Input } from "@tutly/ui/input";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/client";
import { SocialSignin } from "./SocialSignin";
import { useFeatureFlags } from "./FeatureFlagsProvider";

const signInSchema = z.object({
  email: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInInput = z.infer<typeof signInSchema>;

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isGoogleSignInEnabled, isGithubSignInEnabled } = useFeatureFlags();
  const router = useRouter();

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    const error = url.searchParams.get("error");

    if (error) {
      toast.error(decodeURIComponent(error).replace(/\+/g, " "), {
        duration: 3000,
        position: "top-center",
      });

      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);
  const handleSubmit = async (values: SignInInput) => {
    try {
      setIsLoading(true);

      const isEmail = values.email.includes("@");

      const result = isEmail
        ? await authClient.signIn.email(
            {
              email: values.email,
              password: values.password,
              rememberMe: true,
            },
            {
              onSuccess: (ctx) => {
                const authToken = ctx.response.headers.get("set-auth-token");
                if (authToken) {
                  localStorage.setItem("bearer_token", authToken);
                }
              },
            },
          )
        : await authClient.signIn.username(
            {
              username: values.email,
              password: values.password,
              rememberMe: true,
            },
            {
              onSuccess: (ctx) => {
                const authToken = ctx.response.headers.get("set-auth-token");
                if (authToken) {
                  localStorage.setItem("bearer_token", authToken);
                }
              },
            },
          );
      if (result?.data?.user) {
        router.push("/dashboard");
        return;
      }
      toast.error(result?.error?.message || "Failed to sign in", {
        position: "top-center",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Unexpected error occurred", {
        position: "top-center",
        duration: 3000,
      });
      console.error("Error during sign in:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="bg-card/95 w-full max-w-[400px] border shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-2xl shadow-md">
            <span className="text-base font-bold leading-none">T</span>
          </div>
          <CardTitle className="text-foreground text-2xl font-semibold tracking-tight">
            Welcome back
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Sign in to continue your learning journey.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="flex flex-col gap-2"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">
                      Email or Username
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">
                      Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          {...field}
                          disabled={isLoading}
                          autoComplete="current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <Eye className="text-muted-foreground h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-1 flex items-center justify-start">
                <Link
                  href="/reset-password"
                  className="text-primary text-sm hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <Button
                type="submit"
                className="mt-3 h-10 w-full text-sm font-medium"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
            <SocialSignin
              isGoogleSignInEnabled={isGoogleSignInEnabled}
              isGithubSignInEnabled={isGithubSignInEnabled}
              isLoading={isLoading}
            />
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
