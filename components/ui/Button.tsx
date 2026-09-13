"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-transform active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100",
          variant === "primary" && "bg-ink text-white",
          variant === "secondary" && "bg-white text-ink border border-line",
          variant === "ghost" && "bg-transparent text-ink",
          variant === "danger" && "bg-danger/10 text-danger",
          size === "sm" && "h-9 px-4 text-sm",
          size === "md" && "h-12 px-6 text-[15px]",
          size === "lg" && "h-14 px-8 text-base",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
