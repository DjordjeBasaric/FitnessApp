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
          "flex min-h-9 w-full rounded-[var(--rounded-xs)] border border-hairline bg-canvas px-3 py-2 lg:min-h-11 lg:px-4 lg:py-2.5",
          "text-sm font-normal text-ink caret-mint placeholder:text-mute lg:text-[1.1875rem]",
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
