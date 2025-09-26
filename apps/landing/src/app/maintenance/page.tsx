"use client"
import Image from "next/image";
import React from "react";
import Link from "next/link";
import { GithubButton } from "@/components/ui/gitstar-button";


export default function UnderMaintenance() {
    return (
        <div>
            {maintenanceNavbar()}
            <div className="flex flex-col items-center gap-6 my-10">
                <div className="text-center space-y-4 ">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
                        Under Maintenance
                    </h1>

                    <h2 className="text-xl md:text-2xl font-semibold">
                        We'll be back online shortly
                    </h2>
                </div>
                <Image src='/maintenance.svg' className="block" width={500} height={500} alt="icon" />
                <p className="text-base md:text-xl mt-5 max-w-[700px] mx-auto text-center">
                Our server is down due to unforeseen reasons. The engineering team is already working on it. We're treating the issue with the urgency it deserves. Thanks for your patience!
                </p>

            </div>
        </div>
    )
}


const maintenanceNavbar = () => {

  return (
    <div className="sticky top-0 z-50 bg-[#11172e] shadow-sm py-4">
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
          <GithubButton variant={"outline"} size={"sm"} label="Star on GitHub" repoUrl="https://github.com/TutlyLabs/Tutly/" />
        </div>
      </div>
    </div>
  );
}

