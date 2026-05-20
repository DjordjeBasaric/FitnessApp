import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.ComponentProps<"textarea">;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full resize-y rounded-[var(--rounded-xs)] border border-hairline bg-canvas px-3 py-2 lg:min-h-32 lg:px-4 lg:py-3",
        "text-sm leading-relaxed text-ink caret-mint placeholder:text-mute lg:text-[1.1875rem]",
        "transition-[border-color] duration-150 ease-out",
        "focus-visible:border-mint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
