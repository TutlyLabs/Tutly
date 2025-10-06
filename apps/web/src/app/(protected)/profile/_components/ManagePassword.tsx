"use client";

import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/server/auth/client";

const ManagePassword = ({
  initialEmail,
  token,
}: {
  initialEmail?: string;
  token?: string;
}) => {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const checkStrength = (pass: string) => {
    const requirements = [
      { regex: /.{8,}/, text: "At least 8 characters" },
      { regex: /[0-9]/, text: "At least 1 number" },
      { regex: /[a-z]/, text: "At least 1 lowercase letter" },
      { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
    ];

    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const newPasswordStrength = checkStrength(newPassword);

  const getStrengthScore = (strength: { met: boolean; text: string }[]) => {
    return strength.filter((req) => req.met).length;
  };

  const newPasswordScore = useMemo(
    () => getStrengthScore(newPasswordStrength),
    [newPasswordStrength],
  );

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score === 3) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return "Enter a password";
    if (score <= 2) return "Weak password";
    if (score === 3) return "Medium password";
    return "Strong password";
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await authClient.forgetPassword({
        email: email,
        redirectTo: "/reset-password",
      });

      if (result?.data) {
        toast.success("Password reset email sent! Check your inbox.");
        setEmailSent(true);
      } else {
        toast.error(result?.error?.message || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast.error("An error occurred while sending reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    try {
      if (!token) {
        toast.error("Invalid reset link. Please request a new password reset.");
        return;
      }

      const result = await authClient.resetPassword({
        newPassword: newPassword,
        token: token,
      });

      if (result?.data) {
        toast.success("Password reset successfully!");
        router.push("/sign-in");
      } else {
        toast.error(result?.error?.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("An error occurred while resetting password");
    } finally {
      setIsResetting(false);
    }
  };

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">Reset Your Password</h2>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we'll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Reset Link...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </form>
    </div>
  );

  const renderEmailSentStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="mb-2 text-2xl font-bold">Check Your Email</h2>
      <p className="text-muted-foreground mb-4 text-sm">
        We've sent a password reset link to <strong>{email}</strong>
      </p>
      <p className="text-muted-foreground mb-6 text-xs">
        Click the link in your email to continue with resetting your password.
        The link will expire in 1 hour.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          setEmailSent(false);
          setEmail("");
        }}
        className="w-full"
      >
        Use Different Email
      </Button>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">Set New Password</h2>
        <p className="text-muted-foreground text-sm">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setShowPasswordStrength(true);
              }}
              className="pe-9"
              aria-invalid={newPasswordScore < 4}
              aria-describedby="password-strength"
              required
              disabled={isResetting}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {showPasswordStrength && (
            <>
              <div
                className="bg-border mt-3 mb-4 h-1 w-full overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={newPasswordScore}
                aria-valuemin={0}
                aria-valuemax={4}
                aria-label="Password strength"
              >
                <div
                  className={`h-full ${getStrengthColor(newPasswordScore)} transition-all duration-500 ease-out`}
                  style={{ width: `${(newPasswordScore / 4) * 100}%` }}
                />
              </div>

              <p
                id="password-strength"
                className="text-foreground mb-2 text-sm font-medium"
              >
                {getStrengthText(newPasswordScore)}. Must contain:
              </p>

              <ul className="space-y-1.5" aria-label="Password requirements">
                {newPasswordStrength.map((req, index) => (
                  <li key={index} className="flex items-center gap-2">
                    {req.met ? (
                      <Check
                        className="h-4 w-4 text-emerald-500"
                        aria-hidden="true"
                      />
                    ) : (
                      <X
                        className="text-muted-foreground/80 h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`text-xs ${req.met ? "text-emerald-600" : "text-muted-foreground"}`}
                    >
                      {req.text}
                      <span className="sr-only">
                        {req.met
                          ? " - Requirement met"
                          : " - Requirement not met"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pe-9"
              required
              disabled={isResetting}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {newPassword !== confirmPassword && confirmPassword && (
          <p className="text-destructive text-sm">Passwords do not match</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={
            isResetting ||
            !newPassword ||
            !confirmPassword ||
            newPassword !== confirmPassword ||
            newPasswordScore < 4
          }
        >
          {isResetting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="bg-background mx-auto w-full max-w-sm min-w-[300px] rounded-lg p-6 shadow-sm">
        {!emailSent && !token && renderEmailStep()}
        {emailSent && !token && renderEmailSentStep()}
        {token && renderPasswordStep()}
      </div>
    </div>
  );
};

export default ManagePassword;
