"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const tabsListVariants = cva("inline-flex items-center text-muted-foreground", {
  variants: {
    variant: {
      default: "h-9 justify-center rounded-lg bg-muted p-1",
      underline: "h-10 justify-start border-b border-border bg-transparent p-0",
      pills: "h-9 justify-start bg-transparent p-0 gap-1",
      card: "h-10 justify-start border-b border-border bg-card p-0",
    },
    size: {
      sm: "h-8 text-xs",
      default: "h-9 text-sm",
      lg: "h-10 text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-sm  ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
        underline:
          "h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold data-[state=active]:border-primary data-[state=active]:text-foreground",
        pills:
          "rounded-full bg-muted/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        card: "h-9 rounded-t-lg border-b-2 border-transparent bg-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:text-foreground",
      },
      size: {
        sm: "h-7 px-2 text-xs",
        default: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  variant?: VariantProps<typeof tabsListVariants>["variant"];
  size?: VariantProps<typeof tabsListVariants>["size"];
}

const Tabs = TabsPrimitive.Root;

interface TabsListProps
  extends React.ComponentProps<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, size, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, size }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps
  extends React.ComponentProps<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, size, badge, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant, size }), className)}
    {...props}
  >
    <div className="flex items-center gap-2">
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </div>
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentProps<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// Vertical Tabs Component
interface VerticalTabsProps extends TabsProps {
  children: React.ReactNode;
  className?: string;
}

const VerticalTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  VerticalTabsProps
>(({ className, children, ...props }, ref) => (
  <Tabs
    ref={ref}
    orientation="vertical"
    className={cn("flex gap-4", className)}
    {...props}
  >
    {children}
  </Tabs>
));
VerticalTabs.displayName = "VerticalTabs";

const VerticalTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      "flex-col h-auto w-48 bg-transparent",
      variant === "underline" && "border-r border-border border-b-0",
      className
    )}
    variant={variant}
    {...props}
  />
));
VerticalTabsList.displayName = "VerticalTabsList";

const VerticalTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      "w-full justify-start",
      variant === "underline" && "border-r-2 border-b-0 rounded-none pr-4",
      className
    )}
    variant={variant}
    {...props}
  />
));
VerticalTabsTrigger.displayName = "VerticalTabsTrigger";

// Scrollable Tabs Component
interface ScrollableTabsProps extends TabsProps {
  children: React.ReactNode;
  className?: string;
}

const ScrollableTabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  ScrollableTabsProps
>(({ className, children, ...props }, ref) => (
  <Tabs ref={ref} className={cn("w-full", className)} {...props}>
    {children}
  </Tabs>
));
ScrollableTabs.displayName = "ScrollableTabs";

const ScrollableTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, ...props }, ref) => (
  <div className="relative">
    <TabsList
      ref={ref}
      className={cn(
        "flex w-full justify-start overflow-x-auto scrollbar-hide bg-transparent p-0",
        className
      )}
      {...props}
    />
  </div>
));
ScrollableTabsList.displayName = "ScrollableTabsList";

// Tabs with Counter Badge
interface TabWithCounterProps extends TabsTriggerProps {
  count?: number;
  showZero?: boolean;
}

const TabWithCounter = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabWithCounterProps
>(({ count, showZero = false, children, ...props }, ref) => {
  const shouldShowBadge = count !== undefined && (count > 0 || showZero);

  return (
    <TabsTrigger
      ref={ref}
      badge={
        shouldShowBadge ? (
          <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs  text-primary-foreground min-w-[1.25rem] h-5">
            {count}
          </span>
        ) : undefined
      }
      {...props}
    >
      {children}
    </TabsTrigger>
  );
});
TabWithCounter.displayName = "TabWithCounter";

// Enhanced Tabs Component with built-in state management
interface ManagedTabsProps {
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
    count?: number;
    disabled?: boolean;
    content: React.ReactNode;
  }>;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: VariantProps<typeof tabsListVariants>["variant"];
  size?: VariantProps<typeof tabsListVariants>["size"];
  className?: string;
  listClassName?: string;
  contentClassName?: string;
}

const ManagedTabs = React.forwardRef<HTMLDivElement, ManagedTabsProps>(
  (
    {
      tabs,
      defaultValue,
      value,
      onValueChange,
      variant,
      size,
      className,
      listClassName,
      contentClassName,
    },
    ref
  ) => {
    return (
      <Tabs
        ref={ref}
        value={value}
        defaultValue={defaultValue || tabs[0]?.value}
        onValueChange={onValueChange}
        className={className}
      >
        <TabsList variant={variant} size={size} className={listClassName}>
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              variant={variant}
              size={size}
              icon={tab.icon}
              badge={
                tab.badge ||
                (tab.count !== undefined ? (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs  text-primary-foreground min-w-[1.25rem] h-5">
                    {tab.count}
                  </span>
                ) : undefined)
              }
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={contentClassName}
          >
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    );
  }
);
ManagedTabs.displayName = "ManagedTabs";

export {
  ManagedTabs,
  ScrollableTabs,
  ScrollableTabsList,
  Tabs,
  TabsContent,
  TabsList,
  tabsListVariants,
  TabsTrigger,
  tabsTriggerVariants,
  TabWithCounter,
  VerticalTabs,
  VerticalTabsList,
  VerticalTabsTrigger,
};
