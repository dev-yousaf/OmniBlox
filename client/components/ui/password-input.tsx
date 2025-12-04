"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Optional id for the toggle button aria-controls mapping.
   */
  toggleAriaLabel?: string;
}

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ className, toggleAriaLabel, ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(false);

  const ariaLabel =
    toggleAriaLabel || (isVisible ? "Hide password" : "Show password");

  const handleToggle = () => {
    setIsVisible((prev) => !prev);
  };

  return (
    <>
      <Input
        ref={ref}
        type={isVisible ? "text" : "password"}
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={handleToggle}
        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground transition hover:text-foreground"
        aria-label={ariaLabel}
      >
        {isVisible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </>
  );
});
PasswordInput.displayName = "PasswordInput";
