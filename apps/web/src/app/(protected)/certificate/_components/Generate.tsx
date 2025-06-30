"use client";

import html2canvas from "html2canvas";
import Image from "next/image";
import { useState } from "react";

type GenerateProps = {
  user: { username: string; name: string };
};

export default function Generate({ user }: GenerateProps) {
  const [isLoading, setIsLoading] = useState(false);

  const downloadCertificate = async () => {
    const certificateElement = document.getElementById("certificate");
    if (!certificateElement) return;

    setIsLoading(true);
    try {
      const canvas = await html2canvas(certificateElement);
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `${user?.name}_Certificate.png`;
      link.click();
    } catch (error) {
      console.error("Failed to generate certificate:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black text-lg font-bold text-white">
          Download in progreess...
        </div>
      )}
      <button
        onClick={() => void downloadCertificate()}
        className="mb-4 rounded bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
        disabled={isLoading}
      >
        {isLoading ? "Downloading..." : "Download Certificate"}
      </button>
      <div
        id="certificate"
        className="relative mx-auto h-[566px] w-[800px] border border-gray-400"
      >
        <Image
          src="/gold_template.png"
          alt="Certificate"
          fill
          className="object-cover"
          priority
        />
        {/* <img src="/silver_template.png" alt="Certificate" className="w-full h-full object-cover" /> */}
        {/* <img src="/bronze_template.png" alt="Certificate" className="w-full h-full object-cover" /> */}
        <div className="absolute top-[45%] left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 transform text-center text-3xl font-bold text-black uppercase">
          {user?.name}
        </div>
        <div className="absolute top-[60%] left-1/2 w-[75%] -translate-x-1/2 -translate-y-1/2 transform text-center text-lg leading-relaxed font-medium text-[#333]">
          This certificate is awarded to{" "}
          <span className="font-bold">{user?.name}</span>, bearing roll number{" "}
          <span className="font-bold">{user?.username}</span>, for successfully
          completing the Web Development Course (MERN Stack). We recognize their
          dedication and hard work in acquiring the skills necessary for modern
          web development.
        </div>
        <div className="absolute top-[70%] left-16 flex flex-col items-center">
          <Image
            src="/signature.png"
            alt="Signature"
            width={160}
            height={80}
            className="h-auto w-40"
          />
          <p className="text-sm font-bold text-gray-600">Rajesh Thappeta</p>
          <p className="text-xs text-gray-600">Course Instructor</p>
        </div>
        <div className="absolute top-[88%] left-1/2 -translate-x-1/2 transform text-center text-sm font-semibold text-[#555]">
          Presented by <span className="text-blue-900">Tutly</span>
        </div>
      </div>
    </div>
  );
}
