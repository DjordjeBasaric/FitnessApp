import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const variants = cva(
  [
    "verge-press inline-flex items-center justify-center gap-2 border border-transparent",
    "font-button-md transition-[background-color,color,box-shadow] duration-[180ms] ease-out",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
    "disabled:pointer-events-none disabled:opacity-40",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "rounded-[var(--rounded-lg)] bg-mint px-4 py-2 text-on-primary min-h-9 lg:px-6 lg:py-2.5 lg:min-h-11 hover:bg-white/20 hover:text-on-primary hover:shadow-[0_0_0_1px_#c2c2c2]",
        secondary:
          "rounded-[var(--rounded-lg)] bg-surface px-4 py-2 text-charcoal min-h-9 lg:px-6 lg:py-2.5 lg:min-h-11 hover:bg-white/20 hover:text-on-primary hover:shadow-[0_0_0_1px_#c2c2c2]",
        outline:
          "rounded-[var(--rounded-pill)] border border-mint bg-transparent px-4 py-2 text-mint min-h-9 lg:px-5 lg:py-2.5 lg:min-h-11 hover:bg-mint hover:text-on-primary",
        ghost:
          "rounded-[var(--rounded-full)] border border-hairline-soft bg-surface text-ink min-h-10 min-w-10 p-0 hover:text-link-hover",
        "on-image":
          "rounded-[var(--rounded-lg)] border border-hairline bg-canvas px-6 py-2.5 text-ink min-h-10",
        chip:
          "rounded-[var(--rounded-md)] border border-hairline-soft bg-surface px-4 py-2 text-ink min-h-10 font-sans text-base normal-case tracking-normal",
        "chip-active":
          "rounded-[var(--rounded-md)] bg-mint px-4 py-2 text-on-primary min-h-10 font-sans text-base font-bold normal-case tracking-normal",
        purple:
          "rounded-[var(--rounded-xl)] border border-purple bg-transparent px-5 py-2.5 text-purple min-h-11 hover:bg-purple hover:text-ink",
      },
      size: {
        default: "",
        sm: "min-h-9 px-4 py-2 text-[0.8125rem]",
        lg: "min-h-12 px-8",
        icon: "size-11 min-h-11 min-w-11 rounded-[var(--rounded-full)]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof variants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(variants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
