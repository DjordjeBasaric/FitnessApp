import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

export const Label = ({ className, ...props }: React.ComponentPropsWithoutRef<
  typeof LabelPrimitive.Root
>) => (
  <LabelPrimitive.Root
    className={cn("font-label-mono text-mute", className)}
    {...props}
  />
);
