"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { authClient } from "@/server/auth/client";
import type { Account } from "@prisma/client";
import Image from "next/image";

export const GithubIntegration = ({
  github,
}: {
  github?: Account | undefined;
}) => {
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await authClient.unlinkAccount({ providerId: "github" });
      router.refresh();
    } catch (error) {
      console.error("Failed to unlink account:", error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleLink = async () => {
    setIsLinking(true);
    try {
      const result = await authClient.linkSocial({
        provider: "github",
        callbackURL: "/integrations",
      });

      if (result.data && "url" in result.data) {
        window.location.href = result.data.url;
      } else {
        throw new Error("Failed to get OAuth URL");
      }
    } catch (error) {
      console.error("Failed to link account:", error);
    } finally {
      setIsLinking(false);
    }
  };

  const avatar = "/integrations/github.png";
  const displayName = github?.accountId || "GitHub Account";

  return (
    <Accordion type="single" collapsible className="mt-8 w-full">
      <AccordionItem value="github">
        <AccordionTrigger className="flex flex-row items-center gap-4 p-4">
          <div className="flex flex-row items-center gap-4">
            <Image
              src="/integrations/github.png"
              alt="github"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full bg-white"
            />
            <span className="text-lg font-semibold">GitHub</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="p-4 pt-0">
          <div className="flex flex-col gap-4">
            {github ? (
              <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <Image
                    src={avatar}
                    alt="github avatar"
                    width={28}
                    height={28}
                    className="h-7 w-7 rounded-full border"
                  />
                  <span className="font-mono text-sm text-blue-600">
                    {displayName}
                  </span>
                </div>
                <Button
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  variant="outline"
                  size="sm"
                  className="rounded border border-blue-600 bg-[#4285F4] px-3 py-1 text-xs text-white hover:bg-[#357ae8] disabled:opacity-60"
                >
                  {isUnlinking ? "Unlinking..." : "Unlink"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-900">
                <span className="text-gray-700 dark:text-gray-200">
                  Not linked
                </span>
                <Button
                  onClick={handleLink}
                  disabled={isLinking}
                  size="sm"
                  className="inline-block rounded bg-[#4285F4] px-4 py-2 text-xs text-white transition-colors hover:bg-[#357ae8]"
                >
                  {isLinking ? "Linking..." : "Link GitHub"}
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
