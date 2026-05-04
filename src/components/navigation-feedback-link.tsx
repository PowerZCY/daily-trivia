"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useState } from "react";
import { cn } from "@windrun-huaiin/lib/utils";

type NavigationFeedbackLinkProps = ComponentProps<typeof Link> & {
  activeClassName?: string;
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
  onClick,
  ...props
}: NavigationFeedbackLinkProps) {
  const [isActive, setIsActive] = useState(false);

  return (
    <Link
      {...props}
      aria-current={isActive ? "true" : props["aria-current"]}
      className={cn(className, isActive && activeClassName)}
      onClick={(event) => {
        onClick?.(event);
        if (shouldShowFeedback(event)) {
          setIsActive(true);
        }
      }}
    />
  );
}
