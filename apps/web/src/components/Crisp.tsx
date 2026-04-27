"use client";

import { useEffect } from "react";
import { useLayout } from "@/providers/layout-provider";

interface CrispProps {
  user?: {
    email: string | null;
    name: string;
    image: string | null;
    role: { name: string } | string;
    id: string;
    username: string;
    mobile: string | null;
  };
  organization?: {
    orgCode: string;
  } | null;
}

type CrispCommand = [string, ...unknown[]];

declare global {
  interface Window {
    $crisp: CrispCommand[];
    CRISP_WEBSITE_ID: string;
  }
}

export function openCrispChat() {
  if (typeof window === "undefined") return;
  if (!window.$crisp) return;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  if (isMobile) {
    // Temporarily allow Crisp to render so the panel can show.
    document.documentElement.removeAttribute("data-crisp-mobile-hidden");
  }
  window.$crisp.push(["do", "chat:show"]);
  window.$crisp.push(["do", "chat:open"]);
  if (isMobile) {
    // Re-hide once the chat is dismissed.
    window.$crisp.push([
      "on",
      "chat:closed",
      () => {
        document.documentElement.setAttribute(
          "data-crisp-mobile-hidden",
          "true",
        );
      },
    ]);
  }
}

export default function Crisp({ user, organization }: CrispProps) {
  const { hideCrisp } = useLayout();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.getElementById("crisp-mobile-hide")) {
      const style = document.createElement("style");
      style.id = "crisp-mobile-hide";
      style.textContent = `html[data-crisp-mobile-hidden="true"] .crisp-client,
html[data-crisp-mobile-hidden="true"] #crisp-chatbox {
  display: none !important;
}`;
      document.head.appendChild(style);
    }
    const apply = () => {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        document.documentElement.setAttribute(
          "data-crisp-mobile-hidden",
          "true",
        );
      } else {
        document.documentElement.removeAttribute("data-crisp-mobile-hidden");
      }
    };
    apply();
    const mq = window.matchMedia("(max-width: 767px)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.$crisp) window.$crisp = [];
    window.CRISP_WEBSITE_ID = "b1db5fec-2104-4c63-a771-59dcdcd17215";

    let script = document.querySelector<HTMLScriptElement>(
      "script[data-crisp-loader]",
    );
    const alreadyLoaded = Boolean(script);
    if (!script) {
      script = document.createElement("script");
      script.src = "https://client.crisp.chat/l.js";
      script.async = true;
      script.dataset.crispLoader = "true";
      document.head.appendChild(script);
    }

    const apply = () => {
      if (user) {
        if (user.email) {
          window.$crisp.push(["set", "user:email", user.email]);
        }
        window.$crisp.push(["set", "user:nickname", user.name]);
        if (user.image) {
          window.$crisp.push(["set", "user:avatar", user.image]);
        }
        if (user.mobile) {
          window.$crisp.push(["set", "user:phone", user.mobile]);
        }
        const roleName =
          typeof user.role === "string" ? user.role : user.role.name;
        const sessionData: Array<[string, string]> = [
          ["user_id", user.id],
          ["username", user.username],
          ["role", roleName],
        ];
        if (organization) {
          sessionData.push(["organization", organization.orgCode]);
        }
        window.$crisp.push(["set", "session:data", [sessionData]]);
        if (hideCrisp) {
          window.$crisp.push(["do", "chat:hide"]);
        }
      }
    };

    if (alreadyLoaded) {
      apply();
    } else if (script) {
      script.addEventListener("load", apply, { once: true });
    }
  }, [user, organization, hideCrisp]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.$crisp) {
      if (hideCrisp) {
        window.$crisp.push(["do", "chat:hide"]);
      } else {
        window.$crisp.push(["do", "chat:show"]);
      }
    }
  }, [hideCrisp]);

  return null;
}
