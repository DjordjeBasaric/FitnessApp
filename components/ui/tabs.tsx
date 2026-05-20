import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

export function Tabs(props: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-2 border-b border-hairline-soft bg-canvas pb-0", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Trigger
>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "font-label-mono border-b-2 border-transparent px-4 py-3 text-mute transition-colors duration-150",
        "hover:text-link-hover",
        "data-[state=active]:border-mint data-[state=active]:text-ink data-[state=active]:shadow-[inset_0_-2px_0_0_var(--mint)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.Content
>) {
  return <TabsPrimitive.Content className={cn("pt-6 outline-none", className)} {...props} />;
}
