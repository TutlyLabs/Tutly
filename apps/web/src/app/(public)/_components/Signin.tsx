"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { redirect } from "next/navigation";

const signInSchema = z.object({
  email: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInInput = z.infer<typeof signInSchema>;

export function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);

      const res = await fetch("/api/auth/signin/credentials", {
        method: "POST",
        body: formData,
      });

      if (res.redirected) {
        // NextResponse.redirect is handled this way on client
        window.location.href = res.url;
        return;
      }

      const data = await res.json();
      toast.error(data?.error || "Failed to sign in", {
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

  // const handleGoogleSignIn = async () => {
  //   try {
  //     setIsGoogleLoading(true);

  //     const currentUrl = new URL(window.location.href);
  //     const error = currentUrl.searchParams.get("error");

  //     if (error) {
  //       throw new Error(decodeURIComponent(error).replace(/\+/g, " "));
  //     }

  //     window.location.href = "/api/auth/signin/google";
  //   } catch (error) {
  //     toast.error(error instanceof Error ? error.message : "Failed to initiate Google sign in", {
  //       duration: 3000,
  //       position: "top-center",
  //     });
  //   } finally {
  //     setIsGoogleLoading(false);
  //   }
  // };

  return (
    <div className="flex justify-center items-center p-2 min-h-screen">
      <Card className="bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm border-white/30 dark:border-gray-700/50 w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="font-bold text-2xl text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="flex flex-col gap-2" onSubmit={form.handleSubmit(handleSubmit)}>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Email or Username</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} autoComplete="username" />
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
                    <FormLabel className="text-foreground/80">Password</FormLabel>
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
                          className="top-0 right-0 absolute hover:bg-transparent px-3 py-2 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-start items-center mt-1">
                <a href="/reset-password" className="text-primary text-sm hover:underline">
                  Forgot Password?
                </a>
              </div>
              <Button
                type="submit"
                className="bg-primary/90 hover:bg-primary mt-4 w-full transition-colors"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            {/* <div className="flex flex-col gap-3 mt-6">
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 dark:bg-gray-900/20 dark:hover:bg-gray-800/30 backdrop-blur-sm border-white/30 dark:border-gray-700/50 w-full"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                {isGoogleLoading ? "Connecting..." : "Sign in with Google"}
              </Button>
            </div> */}
          </Form>
        </CardContent>
      </Card>
    </div >
  );
}
