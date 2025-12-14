"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

function Avatar({ size = "md", className, ...props }: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({ className, src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={src}
      alt={alt}
      {...props}
    />
  );
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  delayMs?: number;
}

function AvatarFallback({ className, children, ...props }: AvatarFallbackProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
