import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.ComponentProps<"input">;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex min-h-11 w-full rounded-[var(--rounded-xs)] border border-hairline bg-canvas px-4 py-2.5",
          "text-[1.1875rem] font-normal text-ink caret-mint placeholder:text-mute",
          "transition-[border-color] duration-150 ease-out",
          "focus-visible:border-mint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
