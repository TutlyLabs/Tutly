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
import { authClient } from "@/server/auth/client";
import { SocialSignin } from "./SocialSignin";
import { useFeatureFlags } from "./FeatureFlagsProvider";
import { useRouter } from "next/navigation";

const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    username: z.string().min(1, "Username is required"),
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpInput = z.infer<typeof signUpSchema>;

export function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isGoogleSignInEnabled, isGithubSignInEnabled } = useFeatureFlags();
  const router = useRouter();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
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
  const handleSubmit = async (values: SignUpInput) => {
    try {
      setIsLoading(true);
      const result = await authClient.signUp.email(
        {
          email: values.email,
          password: values.password,
          name: values.name,
          username: values.username,
          callbackURL: "/dashboard",
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
        toast.success("Sign up successful!");
        router.push("/dashboard");
        return;
      }
      toast.error(result?.error?.message || "Failed to sign up", {
        position: "top-center",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Unexpected error occurred", {
        position: "top-center",
        duration: 3000,
      });
      console.error("Error during sign up:", error);
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
            Create your account
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Get started with Tutly in seconds.
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">
                      Username
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isLoading}
                        autoComplete="email"
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
                          autoComplete="new-password"
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                          disabled={isLoading}
                          autoComplete="new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                        >
                          {showConfirmPassword ? (
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
                  href="/sign-in"
                  className="text-primary text-sm hover:underline"
                >
                  Already have an account? Sign In
                </Link>
              </div>
              <Button
                type="submit"
                className="bg-primary/90 hover:bg-primary mt-4 w-full transition-colors"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Signing up..." : "Sign up"}
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
