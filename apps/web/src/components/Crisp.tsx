"use client";

import { useEffect } from "react";

interface CrispProps {
  user?: {
    email: string;
    name: string;
    image: string;
    role: string;
    id: string;
    username: string;
    mobile: string;
  };
  organization?: {
    orgCode: string;
  };
}

type CrispCommand = [string, ...unknown[]];

declare global {
  interface Window {
    $crisp: CrispCommand[];
    CRISP_WEBSITE_ID: string;
  }
}

export default function Crisp({ user, organization }: CrispProps) {
  useEffect(() => {
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = "b1db5fec-2104-4c63-a771-59dcdcd17215";

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (user) {
        window.$crisp.push(["set", "user:email", user.email]);
        window.$crisp.push(["set", "user:nickname", user.name]);
        window.$crisp.push(["set", "user:avatar", user.image]);
        window.$crisp.push(["set", "user:role", user.role]);
        window.$crisp.push(["set", "user:id", user.id]);
        window.$crisp.push(["set", "user:username", user.username]);
        window.$crisp.push(["set", "user:mobile", user.mobile]);
        if (organization) {
          window.$crisp.push([
            "set",
            "user:organization",
            organization.orgCode,
          ]);
        }
      }
    };

    return () => {
      script.remove();
    };
  }, [user, organization]);

  return null;
}
