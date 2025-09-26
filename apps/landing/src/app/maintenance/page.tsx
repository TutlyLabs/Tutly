"use client"
import Image from "next/image";

export default function UnderMaintenance() {

    return (
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
    )
}