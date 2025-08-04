"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const timelineVariants = cva("relative", {
  variants: {
    orientation: {
      vertical: "flex flex-col",
      horizontal: "flex flex-row items-center overflow-x-auto",
    },
    layout: {
      default: "",
      left: "",
      right: "",
      alternating: "",
    },
    size: {
      sm: "",
      default: "",
      lg: "",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    layout: "default",
    size: "default",
  },
});

const timelineItemVariants = cva("relative flex", {
  variants: {
    orientation: {
      vertical: "pb-8 last:pb-0",
      horizontal: "pr-8 last:pr-0 flex-shrink-0",
    },
    layout: {
      default: "",
      left: "md:justify-start",
      right: "md:justify-end",
      alternating: "",
    },
    size: {
      sm: "gap-2",
      default: "gap-3",
      lg: "gap-4",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    layout: "default",
    size: "default",
  },
});

const timelineConnectorVariants = cva("absolute bg-border", {
  variants: {
    orientation: {
      vertical: "left-[15px] top-[30px] h-full w-[2px] last:hidden",
      horizontal: "top-[15px] left-[30px] w-full h-[2px] last:hidden",
    },
    layout: {
      default: "",
      left: "md:left-[calc(100%-15px)]",
      right: "md:left-[15px]",
      alternating: "",
    },
    variant: {
      default: "bg-border",
      success: "bg-green-300",
      warning: "bg-yellow-300",
      destructive: "bg-red-300",
      primary: "bg-primary/30",
      dashed:
        "bg-gradient-to-b from-primary/30 via-transparent to-primary/30 bg-[length:2px_8px]",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    layout: "default",
    variant: "default",
  },
});

const timelineDotVariants = cva(
  "relative z-10 flex items-center justify-center rounded-full border-2 transition-all duration-200",
  {
    variants: {
      size: {
        sm: "h-6 w-6",
        default: "h-8 w-8",
        lg: "h-10 w-10",
      },
      variant: {
        default: "border-secondary-400 bg-white text-secondary-400",
        success: "border-primary bg-primary text-white",
        warning: "border-yellow-500 text-yellow-500 bg-white",
        destructive: "border-red-500 text-red-500 bg-white",
        primary: "border-primary bg-primary text-white",
        filled: "border-primary bg-primary text-white",
        inactive: "border-secondary-300 bg-white text-secondary-300",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

interface TimelineProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineVariants> {}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ className, orientation, layout, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(timelineVariants({ orientation, layout, size }), className)}
      {...props}
    />
  )
);
Timeline.displayName = "Timeline";

interface TimelineItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineItemVariants> {
  dot?: React.ReactNode;
  dotVariant?: VariantProps<typeof timelineDotVariants>["variant"];
  dotSize?: VariantProps<typeof timelineDotVariants>["size"];
  connectorVariant?: VariantProps<typeof timelineConnectorVariants>["variant"];
  isLast?: boolean;
  index?: number;
  card?: boolean;
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  (
    {
      className,
      orientation,
      layout,
      size,
      dot,
      dotVariant,
      dotSize,
      connectorVariant,
      isLast,
      index = 0,
      card = false,
      children,
      ...props
    },
    ref
  ) => {
    // Determine layout for alternating pattern
    const isEven = index % 2 === 0;
    const itemLayout =
      layout === "alternating" ? (isEven ? "left" : "right") : layout;

    // Content with optional card styling
    const content = (
      <div
        className={cn(
          "flex-1 min-w-0",
          card && "bg-white border border-gray-200 rounded-lg p-4 shadow-sm",
          itemLayout === "left" && "md:pr-8 md:text-right",
          itemLayout === "right" && "md:pl-8 md:text-left",
          layout === "alternating" && "md:w-[calc(50%-2rem)]"
        )}
      >
        {children}
      </div>
    );

    // Dot element with connector
    const dotElement = (
      <div
        className={cn(
          "flex flex-col items-center",
          layout === "alternating" &&
            "md:absolute md:left-1/2 md:-translate-x-1/2"
        )}
      >
        <div
          className={cn(
            timelineDotVariants({ size: dotSize || size, variant: dotVariant })
          )}
        >
          {dot}
        </div>
        {!isLast && (
          <div
            className={cn(
              timelineConnectorVariants({
                orientation,
                layout: itemLayout,
                variant: connectorVariant,
              })
            )}
          />
        )}
      </div>
    );

    return (
      <div
        ref={ref}
        className={cn(
          timelineItemVariants({ orientation, layout: itemLayout, size }),
          layout === "alternating" && "md:relative",
          className
        )}
        {...props}
      >
        {itemLayout === "right" && layout !== "default" ? (
          <>
            <div className="hidden md:block md:flex-1" />
            {dotElement}
            {content}
          </>
        ) : itemLayout === "left" && layout !== "default" ? (
          <>
            {content}
            {dotElement}
            <div className="hidden md:block md:flex-1" />
          </>
        ) : (
          <>
            {dotElement}
            {content}
          </>
        )}
      </div>
    );
  }
);
TimelineItem.displayName = "TimelineItem";

const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-1", className)} {...props} />
));
TimelineContent.displayName = "TimelineContent";

// Timeline Card component for enhanced styling
const TimelineCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow",
      className
    )}
    {...props}
  />
));
TimelineCard.displayName = "TimelineCard";

const TimelineTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
TimelineTitle.displayName = "TimelineTitle";

const TimelineDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
TimelineDescription.displayName = "TimelineDescription";

const TimelineTime = React.forwardRef<
  HTMLTimeElement,
  React.HTMLAttributes<HTMLTimeElement>
>(({ className, ...props }, ref) => (
  <time
    ref={ref}
    className={cn("text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
TimelineTime.displayName = "TimelineTime";

// Alternating Timeline Component
interface AlternatingTimelineProps {
  items: Array<{
    id: string;
    title: string;
    description?: string;
    date?: string;
    icon?: React.ReactNode;
    variant?: VariantProps<typeof timelineDotVariants>["variant"];
    content?: React.ReactNode;
  }>;
  className?: string;
  size?: VariantProps<typeof timelineVariants>["size"];
  connectorVariant?: VariantProps<typeof timelineConnectorVariants>["variant"];
  showCards?: boolean;
  layout?: "alternating" | "left" | "right";
}

const AlternatingTimeline = React.forwardRef<
  HTMLDivElement,
  AlternatingTimelineProps
>(
  (
    {
      items,
      className,
      size = "default",
      connectorVariant = "primary",
      showCards = true,
      layout = "alternating",
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("relative", className)}>
        {/* Timeline items */}
        <div className="relative">
          {items.map((item, index) => {
            const isEven = index % 2 === 0;
            const position =
              layout === "alternating" ? (isEven ? "left" : "right") : layout;
            const isLast = index === items.length - 1;

            return (
              <div
                key={item.id}
                className={cn(
                  "relative flex items-start",
                  layout === "alternating" && "justify-center",
                  layout === "left" && "justify-start",
                  layout === "right" && "justify-end",
                  index !== 0 && "mt-0",
                  // Add padding-bottom for spacing between items
                  !isLast && "pb-4"
                )}
              >
                {/* Left card */}
                {position === "left" && (
                  <div
                    className={cn(
                      "w-full",
                      layout === "alternating" &&
                        "md:w-5/12 md:text-right md:pr-8",
                      layout === "left" && "pl-8"
                    )}
                  >
                    {showCards ? (
                      <TimelineCard>
                        <TimelineContent>
                          <TimelineTitle>{item.title}</TimelineTitle>
                          {item.description && (
                            <TimelineDescription>
                              {item.description}
                            </TimelineDescription>
                          )}
                          {item.date && (
                            <TimelineTime>{item.date}</TimelineTime>
                          )}
                          {item.content && (
                            <div className="mt-2">{item.content}</div>
                          )}
                        </TimelineContent>
                      </TimelineCard>
                    ) : (
                      <TimelineContent>
                        <TimelineTitle>{item.title}</TimelineTitle>
                        {item.description && (
                          <TimelineDescription>
                            {item.description}
                          </TimelineDescription>
                        )}
                        {item.date && <TimelineTime>{item.date}</TimelineTime>}
                        {item.content && (
                          <div className="mt-2">{item.content}</div>
                        )}
                      </TimelineContent>
                    )}
                  </div>
                )}

                {/* Empty space for right-aligned items */}
                {position === "right" && layout === "alternating" && (
                  <div className="w-5/12" />
                )}

                {/* Dot with connector */}
                <div
                  className={cn(
                    "absolute top-0 bottom-0 flex flex-col items-center",
                    layout === "alternating" &&
                      "left-6 md:left-1/2 md:-translate-x-1/2",
                    layout === "left" && "left-6 md:left-0 md:-translate-x-1/2",
                    layout === "right" &&
                      "right-6 md:right-0 md:translate-x-1/2"
                  )}
                >
                  <div
                    className={cn(
                      timelineDotVariants({
                        size: size,
                        variant: item.variant,
                      }),
                      "z-10"
                    )}
                  >
                    {item.icon}
                  </div>
                  {/* Connector line */}
                  {!isLast && (
                    <div className="flex-1 w-0.5 bg-primary/30 mt-1 mb-1" />
                  )}
                </div>

                {/* Empty space for left-aligned items */}
                {position === "left" && layout === "alternating" && (
                  <div className="w-5/12" />
                )}

                {/* Right card */}
                {position === "right" && (
                  <div
                    className={cn(
                      "w-full",
                      layout === "alternating" &&
                        "md:w-5/12 md:text-left md:pl-8",
                      layout === "right" && "pr-12"
                    )}
                  >
                    {showCards ? (
                      <TimelineCard>
                        <TimelineContent>
                          <TimelineTitle>{item.title}</TimelineTitle>
                          {item.description && (
                            <TimelineDescription>
                              {item.description}
                            </TimelineDescription>
                          )}
                          {item.date && (
                            <TimelineTime>{item.date}</TimelineTime>
                          )}
                          {item.content && (
                            <div className="mt-2">{item.content}</div>
                          )}
                        </TimelineContent>
                      </TimelineCard>
                    ) : (
                      <TimelineContent>
                        <TimelineTitle>{item.title}</TimelineTitle>
                        {item.description && (
                          <TimelineDescription>
                            {item.description}
                          </TimelineDescription>
                        )}
                        {item.date && <TimelineTime>{item.date}</TimelineTime>}
                        {item.content && (
                          <div className="mt-2">{item.content}</div>
                        )}
                      </TimelineContent>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
AlternatingTimeline.displayName = "AlternatingTimeline";

// Enhanced Timeline Components

// Timeline with grouped items
interface GroupedTimelineProps {
  groups: Array<{
    date: string;
    items: Array<{
      id: string;
      title: string;
      description?: string;
      time?: string;
      icon?: React.ReactNode;
      variant?: VariantProps<typeof timelineDotVariants>["variant"];
      actions?: React.ReactNode;
    }>;
  }>;
  className?: string;
  size?: VariantProps<typeof timelineVariants>["size"];
}

const GroupedTimeline = React.forwardRef<HTMLDivElement, GroupedTimelineProps>(
  ({ groups, className, size }, ref) => (
    <Timeline ref={ref} className={className} size={size}>
      {groups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span className="px-2">{group.date}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {group.items.map((item, itemIndex) => (
            <TimelineItem
              key={item.id}
              size={size}
              dot={item.icon}
              dotVariant={item.variant}
              isLast={
                groupIndex === groups.length - 1 &&
                itemIndex === group.items.length - 1
              }
            >
              <TimelineContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <TimelineTitle>{item.title}</TimelineTitle>
                    {item.description && (
                      <TimelineDescription>
                        {item.description}
                      </TimelineDescription>
                    )}
                    {item.time && <TimelineTime>{item.time}</TimelineTime>}
                  </div>
                  {item.actions && (
                    <div className="flex-shrink-0 ml-2">{item.actions}</div>
                  )}
                </div>
              </TimelineContent>
            </TimelineItem>
          ))}
        </div>
      ))}
    </Timeline>
  )
);
GroupedTimeline.displayName = "GroupedTimeline";

// Pet Life Timeline (specialized for breeding app)
interface PetTimelineEvent {
  id: string;
  type:
    | "birth"
    | "vaccination"
    | "health_check"
    | "breeding"
    | "show"
    | "achievement"
    | "other";
  title: string;
  description?: string;
  date: string;
  location?: string;
  veterinarian?: string;
  notes?: string;
}

interface PetLifeTimelineProps {
  events: PetTimelineEvent[];
  petName?: string;
  className?: string;
}

const PetLifeTimeline = React.forwardRef<HTMLDivElement, PetLifeTimelineProps>(
  ({ events, petName, className }, ref) => {
    const getEventIcon = (type: PetTimelineEvent["type"]) => {
      switch (type) {
        case "birth":
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          );
        case "vaccination":
          return (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          );
        case "health_check":
          return (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          );
        case "breeding":
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
          );
        case "show":
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          );
        case "achievement":
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          );
        default:
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          );
      }
    };

    const getEventVariant = (
      type: PetTimelineEvent["type"]
    ): VariantProps<typeof timelineDotVariants>["variant"] => {
      switch (type) {
        case "birth":
        case "achievement":
          return "success";
        case "vaccination":
        case "health_check":
          return "primary";
        case "breeding":
          return "filled";
        case "show":
          return "warning";
        default:
          return "default";
      }
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {petName && (
          <div className="text-lg font-semibold">{petName}'s Life Timeline</div>
        )}

        <Timeline>
          {events.map((event, index) => (
            <TimelineItem
              key={event.id}
              dot={getEventIcon(event.type)}
              dotVariant={getEventVariant(event.type)}
              isLast={index === events.length - 1}
            >
              <TimelineContent>
                <TimelineTitle>{event.title}</TimelineTitle>
                {event.description && (
                  <TimelineDescription>{event.description}</TimelineDescription>
                )}
                <TimelineTime>
                  {new Date(event.date).toLocaleDateString()}
                </TimelineTime>
                {(event.location || event.veterinarian) && (
                  <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {event.location && <div>📍 {event.location}</div>}
                    {event.veterinarian && <div>👨‍⚕️ {event.veterinarian}</div>}
                  </div>
                )}
                {event.notes && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    {event.notes}
                  </div>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </div>
    );
  }
);
PetLifeTimeline.displayName = "PetLifeTimeline";

export {
  AlternatingTimeline,
  GroupedTimeline,
  PetLifeTimeline,
  Timeline,
  TimelineCard,
  timelineConnectorVariants,
  TimelineContent,
  TimelineDescription,
  timelineDotVariants,
  TimelineItem,
  timelineItemVariants,
  TimelineTime,
  TimelineTitle,
  timelineVariants,
  type PetTimelineEvent,
};
