"use client";

import type { VariantProps } from "class-variance-authority";
import type { UseInViewOptions } from "motion/react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { Star } from "lucide-react";
import { useInView } from "motion/react";

const githubButtonVariants = cva(
  "backface-visibility-hidden group ring-offset-background relative inline-flex transform-gpu cursor-pointer items-center justify-center overflow-hidden font-medium whitespace-nowrap transition-transform duration-200 ease-out will-change-transform hover:scale-105 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-60 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-gray-700 bg-zinc-950 text-white hover:bg-zinc-900 dark:border-gray-300 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-50",
        outline:
          "bg-background text-accent-foreground border-input hover:bg-accent border",
      },
      size: {
        default:
          "h-8.5 gap-2 rounded-md px-3 text-[0.8125rem] leading-none [&_svg]:size-4",
        sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs leading-none [&_svg]:size-3.5",
        lg: "h-10 gap-2.5 rounded-md px-4 text-sm leading-none [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface GithubButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof githubButtonVariants> {
  /** Whether to round stars */
  roundStars?: boolean;
  /** Whether to show Github icon */
  fixedWidth?: boolean;
  /** Initial number of stars */
  initialStars?: number;
  /** Class for stars */
  starsClass?: string;
  /** Target number of stars to animate to */
  targetStars?: number;
  /** Animation duration in seconds */
  animationDuration?: number;
  /** Animation delay in seconds */
  animationDelay?: number;
  /** Whether to start animation automatically */
  autoAnimate?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Whether to show Github icon */
  showGithubIcon?: boolean;
  /** Whether to show star icon */
  showStarIcon?: boolean;
  /** Whether to show separator */
  separator?: boolean;
  /** Whether stars should be filled */
  filled?: boolean;
  /** Repository URL for actual Github integration */
  repoUrl?: string;
  /** Button text label */
  label?: string;
  /** Use in-view detection to trigger animation */
  useInViewTrigger?: boolean;
  /** In-view options */
  inViewOptions?: UseInViewOptions;
}

function GithubButton({
  initialStars = 0,
  targetStars = 0,
  animationDuration = 2,
  animationDelay = 0,
  autoAnimate = true,
  className,
  variant = "default",
  size = "default",
  showGithubIcon = true,
  showStarIcon = true,
  roundStars = false,
  separator = false,
  filled = false,
  repoUrl,
  onClick,
  label = "",
  useInViewTrigger = false,
  inViewOptions = { once: true },
  ...props
}: GithubButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [starProgress, setStarProgress] = useState(filled ? 100 : 0);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Track previous targetStars to detect changes
  const prevTargetStarsRef = useRef(targetStars);

  // Start animation
  const startAnimation = useCallback(() => {
    if (isAnimating || hasAnimated) return;

    setIsAnimating(true);
    const startTime = Date.now();
    const duration = animationDuration * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Update star fill progress (0 to 100)
      setStarProgress(progress * 100);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setStarProgress(100);
        setIsAnimating(false);
        setHasAnimated(true);
      }
    };

    setTimeout(() => {
      requestAnimationFrame(animate);
    }, animationDelay * 1000);
  }, [isAnimating, hasAnimated, animationDuration, animationDelay]);

  // Use in-view detection if enabled
  const ref = React.useRef(null);
  const isInView = useInView(ref, inViewOptions);

  // Reset animation state when targetStars changes - use useLayoutEffect for synchronous update
  useLayoutEffect(() => {
    if (prevTargetStarsRef.current !== targetStars) {
      prevTargetStarsRef.current = targetStars;
      setHasAnimated(false);
    }
  }, [targetStars, initialStars]);

  // Auto-start animation or use in-view trigger - use callback pattern to avoid direct setState
  useEffect(() => {
    const shouldStart = useInViewTrigger
      ? isInView && !hasAnimated
      : autoAnimate && !hasAnimated;

    if (shouldStart) {
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => {
        startAnimation();
      });
    }
  }, [autoAnimate, useInViewTrigger, isInView, hasAnimated, startAnimation]);

  const navigateToRepo = () => {
    if (!repoUrl) {
      return;
    }

    // Next.js compatible navigation approach
    try {
      // Create a temporary anchor element for reliable navigation
      const link = document.createElement("a");
      link.href = repoUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      // Temporarily add to DOM and click
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Fallback to window.open
      try {
        window.open(repoUrl, "_blank", "noopener,noreferrer");
      } catch {
        // Final fallback
        window.location.href = repoUrl;
      }
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(event);
      return;
    }

    if (repoUrl) {
      navigateToRepo();
    } else if (!hasAnimated) {
      startAnimation();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    // Handle Enter and Space key presses for accessibility
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (repoUrl) {
        navigateToRepo();
      } else if (!hasAnimated) {
        startAnimation();
      }
    }
  };

  return (
    <button
      ref={ref}
      className={cn(
        githubButtonVariants({ variant, size, className }),
        separator && "ps-0",
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={repoUrl ? `Star ${label} on GitHub` : label}
      {...props}
    >
      {showGithubIcon && (
        <div
          className={cn(
            "relative flex h-full items-center justify-center",
            separator && "bg-muted/60 border-input w-9 border-e",
          )}
        >
          <svg role="img" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </div>
      )}

      {label && <span>{label}</span>}

      {/* Animated Star Icon */}
      {showStarIcon && (
        <div className="relative inline-flex shrink-0">
          <Star
            className="fill-muted-foreground text-muted-foreground"
            aria-hidden="true"
          />
          <Star
            className="absolute start-0 top-0 fill-yellow-400 text-yellow-400"
            size={18}
            aria-hidden="true"
            style={{
              clipPath: `inset(${100 - starProgress}% 0 0 0)`,
            }}
          />
        </div>
      )}

      {/* Animated Number Counter with Ticker Effect */}
      {/* <div className={cn('flex flex-col font-semibold relative overflow-hidden', starsClass)}>
        <motion.div
          animate={{ opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            ...transition,
          }}
          className="tabular-nums"
        >
          <span>{currentStars > 0 && formatNumber(currentStars)}</span>
        </motion.div>
        {fixedWidth && <span className="opacity-0 h-0 overflow-hidden tabular-nums">{formatNumber(targetStars)}</span>}
      </div> */}
    </button>
  );
}

export { GithubButton, githubButtonVariants };
export type { GithubButtonProps };
