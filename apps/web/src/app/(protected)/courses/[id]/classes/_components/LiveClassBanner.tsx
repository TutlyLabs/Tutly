"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Video,
  Phone,
  Radio,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface LiveClassBannerProps {
  title: string;
  liveProvider: string | null;
  startTime: Date | null;
  endTime: Date | null;
  meetingUrl: string | null;
  meetingId: string | null;
  meetingPasscode: string | null;
  isAdmin?: boolean;
}

type LiveStatus = "upcoming" | "live" | "ended";

const getTimeRemaining = (targetDate: Date) => {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

const getLiveStatus = (
  startTime: Date | null,
  endTime: Date | null,
): LiveStatus => {
  if (!startTime || !endTime) return "upcoming";
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
};

const formatDateTime = (date: Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export default function LiveClassBanner({
  liveProvider,
  startTime,
  endTime,
  meetingUrl,
  meetingId,
  meetingPasscode,
}: LiveClassBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeRemaining(startTime ?? new Date()),
  );
  const [status, setStatus] = useState<LiveStatus>(
    getLiveStatus(startTime, endTime),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(startTime ?? new Date()));
      setStatus(getLiveStatus(startTime, endTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime]);

  const isZoom = liveProvider === "ZOOM";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const handleJoinMeeting = () => {
    if (meetingUrl) {
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="text-foreground flex h-full w-full flex-col items-center justify-center p-6 text-center sm:p-10">
      <div className="mb-6 flex flex-col items-center justify-center">
        {status === "live" && (
          <>
            <div className="mb-3 rounded-full bg-red-500/10 p-3 dark:bg-red-500/15">
              <Radio className="h-6 w-6 animate-pulse text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Class is LIVE</h2>
          </>
        )}

        {status === "upcoming" && (
          <>
            <span className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase opacity-80">
              Starting Soon
            </span>
            <div className="flex gap-2 sm:gap-3">
              {timeRemaining.days > 0 && (
                <div className="bg-muted/40 flex min-w-[56px] flex-col items-center rounded-xl p-2 sm:p-3">
                  <span className="text-xl font-bold tabular-nums">
                    {timeRemaining.days}
                  </span>
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    Days
                  </span>
                </div>
              )}
              <div className="bg-muted/40 flex min-w-[56px] flex-col items-center rounded-xl p-2 sm:p-3">
                <span className="text-xl font-bold tabular-nums">
                  {String(timeRemaining.hours).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Hrs
                </span>
              </div>
              <div className="bg-muted/40 flex min-w-[56px] flex-col items-center rounded-xl p-2 sm:p-3">
                <span className="text-xl font-bold tabular-nums">
                  {String(timeRemaining.minutes).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Min
                </span>
              </div>
              <div className="bg-muted/40 flex min-w-[56px] flex-col items-center rounded-xl p-2 sm:p-3">
                <span className="text-xl font-bold tabular-nums">
                  {String(timeRemaining.seconds).padStart(2, "0")}
                </span>
                <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Sec
                </span>
              </div>
            </div>
          </>
        )}

        {status === "ended" && (
          <>
            <div className="bg-muted/40 mb-3 rounded-full p-3">
              <Calendar className="text-muted-foreground/50 h-6 w-6" />
            </div>
            <h2 className="text-muted-foreground text-xl font-bold tracking-tight opacity-90">
              Class Ended
            </h2>
          </>
        )}
      </div>

      <div className="text-muted-foreground mb-6 flex flex-col items-center gap-1.5 text-sm">
        <div className="flex items-center gap-1.5 font-medium">
          {isZoom ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {isZoom ? "Zoom Meeting" : "Google Meet"}
        </div>
        {startTime && (
          <div className="mt-0.5 text-xs opacity-80">
            {formatDateTime(startTime)}
            {endTime && ` — ${formatDateTime(endTime)}`}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {status !== "ended" && (meetingId || meetingPasscode) && (
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            {meetingId && (
              <button
                onClick={() => copyToClipboard(meetingId, "Meeting ID")}
                className="bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors sm:px-3"
              >
                ID: {meetingId}{" "}
                <Copy className="h-3 w-3 opacity-40 hover:opacity-100" />
              </button>
            )}
            {meetingPasscode && (
              <button
                onClick={() => copyToClipboard(meetingPasscode, "Passcode")}
                className="bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 font-mono text-[11px] transition-colors sm:px-3"
              >
                Pass: {meetingPasscode}{" "}
                <Copy className="h-3 w-3 opacity-40 hover:opacity-100" />
              </button>
            )}
          </div>
        )}

        {meetingUrl && status !== "ended" && (
          <Button
            onClick={handleJoinMeeting}
            variant={status === "live" ? "default" : "outline"}
            className="w-[200px] gap-2 font-semibold shadow-sm sm:w-[240px]"
            size={status === "live" ? "default" : "sm"}
          >
            <ExternalLink className="h-4 w-4" />
            {status === "live" ? "Join Meeting Now" : "Open Link"}
          </Button>
        )}
      </div>
    </div>
  );
}
