"use client";

import { PageLayout } from "@/components/PageLayout";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VSCodePage() {
  const searchParams = useSearchParams();
  const [iframeSrc, setIframeSrc] = useState("/vscode/index.html");

  useEffect(() => {
    if (searchParams) {
      const params = searchParams.toString();
      if (params) {
        setIframeSrc(`/vscode/index.html?${params}`);
      }
    }
  }, [searchParams]);

  return (
    <PageLayout hideCrisp>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
          margin: 0,
          padding: 0,
        }}
      >
        <iframe
          src={iframeSrc}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </PageLayout>
  );
}
