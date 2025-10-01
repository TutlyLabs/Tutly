"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GithubButton } from "@/components/ui/gitstar-button";

export default function UnderMaintenance() {
  redirect("https://learn.tutly.in");

  return (
    <div>
      {maintenanceNavbar()}
      <div className="my-10 flex flex-col items-center gap-6">
        <div className="space-y-4 text-center">
          <h1 className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            Under Maintenance
          </h1>

          <h2 className="text-xl font-semibold md:text-2xl">
            We'll be back online shortly
          </h2>
        </div>
        <Image
          src="/maintenance.svg"
          className="block"
          width={500}
          height={500}
          alt="icon"
        />
        <p className="mx-auto mt-5 max-w-[700px] text-center text-base md:text-xl">
          Our server is down due to unforeseen reasons. The engineering team is
          already working on it. We're treating the issue with the urgency it
          deserves. Thanks for your patience!
        </p>
      </div>
    </div>
  );
}

const maintenanceNavbar = () => {
  return (
    <div className="sticky top-0 z-50 bg-[#11172e] py-4 shadow-sm">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-20">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo.png"
              className="rounded"
              width={24}
              height={24}
              alt="logo"
            />
            <div>
              <h1 className="text-xl font-extrabold text-white sm:text-2xl">
                Tutly
              </h1>
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <GithubButton
            variant={"outline"}
            size={"sm"}
            label="Star on GitHub"
            repoUrl="https://github.com/TutlyLabs/Tutly/"
          />
        </div>
      </div>
    </div>
  );
};
