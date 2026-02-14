"use client";

import {
  Maximize,
  Pause,
  Play,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VideoPlayerProps {
  videoId: string;
  videoType: "YOUTUBE" | "DRIVE";
}

interface YouTubePlayer {
  getDuration: () => number;
  getCurrentTime: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

interface YouTubePlayerEvent {
  target: YouTubePlayer;
  data: number;
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string | HTMLElement,
        config: YouTubePlayerConfig,
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerConfig {
  height: string;
  width: string;
  videoId: string;
  playerVars: {
    controls: number;
    disablekb: number;
    enablejsapi: number;
    modestbranding: number;
    rel: number;
    showinfo: number;
    iv_load_policy: number;
    fs: number;
  };
  events: {
    onReady: (event: YouTubePlayerEvent) => void;
    onStateChange: (event: YouTubePlayerEvent) => void;
  };
}

const VideoPlayer = ({ videoId, videoType }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [_isFullscreen, setIsFullscreen] = useState(false);
  const [_playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);

  const videoRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<YouTubePlayer | null>(null);
  const driveVideoRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let ytPlayer: YouTubePlayer | undefined;

    const initYouTube = () => {
      if (!window.YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
        return;
      }

      if (!videoRef.current) return;

      ytPlayer = new window.YT.Player(videoRef.current, {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          fs: 0,
        },
        events: {
          onReady: (event: YouTubePlayerEvent) => {
            setPlayer(event.target);
            setDuration(event.target.getDuration());
            event.target.setVolume(volume * 100);
          },
          onStateChange: (event: YouTubePlayerEvent) => {
            setIsPlaying(event.data === window.YT.PlayerState.PLAYING);
            setIsBuffering(event.data === window.YT.PlayerState.BUFFERING);

            if (event.data === window.YT.PlayerState.PLAYING) {
              setDuration(event.target.getDuration());
            }
          },
        },
      });
    };

    const initDriveVideo = () => {
      if (!videoRef.current) return;

      const driveIframe = document.createElement("iframe");
      driveIframe.src = `https://drive.google.com/file/d/${videoId}/preview`;
      driveIframe.style.width = "100%";
      driveIframe.style.height = "100%";
      driveIframe.style.border = "none";
      driveIframe.allow =
        "autoplay; encrypted-media; picture-in-picture; fullscreen";
      driveIframe.allowFullscreen = true;
      driveIframe.referrerPolicy = "strict-origin-when-cross-origin";
      driveIframe.setAttribute("credentialless", "true");

      videoRef.current.innerHTML = "";
      videoRef.current.appendChild(driveIframe);
      driveVideoRef.current = driveIframe;
    };

    if (videoType === "YOUTUBE") {
      window.onYouTubeIframeAPIReady = initYouTube;
      initYouTube();
    } else if (videoType === "DRIVE") {
      initDriveVideo();
    }

    return () => {
      if (ytPlayer) {
        ytPlayer.destroy();
      }
    };
  }, [videoId, videoType, volume]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    if (videoType === "YOUTUBE" && player) {
      isPlaying ? player.pauseVideo() : player.playVideo();
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoType === "YOUTUBE" && player && value[0] !== undefined) {
      player.seekTo(value[0], true);
      setCurrentTime(value[0]);
    }
  };

  const seek = (seconds: number) => {
    if (videoType === "YOUTUBE" && player) {
      const newTime = currentTime + seconds;
      player.seekTo(newTime, true);
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (value[0] === undefined) return;

    const newVolume = value[0];
    if (videoType === "YOUTUBE" && player) {
      player.setVolume(newVolume * 100);
      newVolume === 0 ? player.mute() : player.unMute();
    }
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoType === "YOUTUBE" && player) {
      if (isMuted) {
        player.unMute();
        player.setVolume(volume * 100);
      } else {
        player.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (videoType === "YOUTUBE" && player) {
      player.setPlaybackRate(speed);
      setPlaybackSpeed(speed);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (player && isPlaying && videoType === "YOUTUBE") {
        setCurrentTime(player.getCurrentTime());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, isPlaying, videoType]);

  return (
    <div
      ref={playerContainerRef}
      className="group relative aspect-video overflow-hidden rounded-lg bg-black"
    >
      <div ref={videoRef} className="absolute inset-0" />

      {/* Custom Controls - Only show for YouTube videos */}
      {videoType === "YOUTUBE" && (
        <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={handleSeek}
            className="mb-4"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={() => seek(-10)}
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>-10 seconds</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={() => seek(10)}
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>+10 seconds</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <span className="text-sm text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  min={0}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(0.25)}>
                    0.25x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(0.5)}>
                    0.5x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(0.75)}>
                    0.75x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(1)}>
                    Normal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(1.25)}>
                    1.25x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(1.5)}>
                    1.5x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(1.75)}>
                    1.75x
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePlaybackSpeed(2)}>
                    2x
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleFullscreen}
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {isBuffering && videoType === "YOUTUBE" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
