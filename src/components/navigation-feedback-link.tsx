"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@windrun-huaiin/lib/utils";

type NavigationFeedbackLinkProps = ComponentProps<typeof Link> & {
  activeClassName?: string;
  feedbackDurationMs?: number;
};

function shouldShowFeedback(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

export function NavigationFeedbackLink({
  activeClassName,
  className,
  feedbackDurationMs = 800,
  onClick,
  ...props
}: NavigationFeedbackLinkProps) {
  const [isActive, setIsActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Link
      {...props}
      aria-current={isActive ? "true" : props["aria-current"]}
      className={cn(className, isActive && activeClassName)}
      onClick={(event) => {
        onClick?.(event);
        if (shouldShowFeedback(event)) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          setIsActive(true);
          timeoutRef.current = setTimeout(() => {
            setIsActive(false);
            timeoutRef.current = null;
          }, feedbackDurationMs);
        }
      }}
    />
  );
}
