"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const timelineVariants = cva(
  "relative",
  {
    variants: {
      orientation: {
        vertical: "flex flex-col",
        horizontal: "flex flex-row items-center overflow-x-auto",
      },
      size: {
        sm: "",
        default: "",
        lg: "",
      },
    },
    defaultVariants: {
      orientation: "vertical",
      size: "default",
    },
  }
);

const timelineItemVariants = cva(
  "relative flex",
  {
    variants: {
      orientation: {
        vertical: "pb-8 last:pb-0",
        horizontal: "pr-8 last:pr-0 flex-shrink-0",
      },
      size: {
        sm: "gap-2",
        default: "gap-3",
        lg: "gap-4",
      },
    },
    defaultVariants: {
      orientation: "vertical",
      size: "default",
    },
  }
);

const timelineConnectorVariants = cva(
  "absolute bg-border",
  {
    variants: {
      orientation: {
        vertical: "left-[15px] top-[30px] h-full w-[2px] last:hidden",
        horizontal: "top-[15px] left-[30px] w-full h-[2px] last:hidden",
      },
      variant: {
        default: "bg-border",
        success: "bg-green-300",
        warning: "bg-yellow-300",
        destructive: "bg-red-300",
        primary: "bg-primary/30",
      },
    },
    defaultVariants: {
      orientation: "vertical",
      variant: "default",
    },
  }
);

const timelineDotVariants = cva(
  "relative z-10 flex items-center justify-center rounded-full border-2 bg-background",
  {
    variants: {
      size: {
        sm: "h-6 w-6",
        default: "h-8 w-8",
        lg: "h-10 w-10",
      },
      variant: {
        default: "border-border",
        success: "border-green-500 text-green-500",
        warning: "border-yellow-500 text-yellow-500",
        destructive: "border-red-500 text-red-500",
        primary: "border-primary text-primary",
        filled: "border-primary bg-primary text-primary-foreground",
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
  ({ className, orientation, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(timelineVariants({ orientation, size }), className)}
      {...props}
    />
  )
);
Timeline.displayName = "Timeline";

interface TimelineItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof timelineItemVariants> {
  dot?: React.ReactNode;
  dotVariant?: VariantProps<typeof timelineDotVariants>['variant'];
  dotSize?: VariantProps<typeof timelineDotVariants>['size'];
  connectorVariant?: VariantProps<typeof timelineConnectorVariants>['variant'];
  isLast?: boolean;
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ 
    className, 
    orientation, 
    size, 
    dot, 
    dotVariant, 
    dotSize, 
    connectorVariant,
    isLast,
    children, 
    ...props 
  }, ref) => (
    <div
      ref={ref}
      className={cn(timelineItemVariants({ orientation, size }), className)}
      {...props}
    >
      <div className="flex flex-col items-center">
        <div className={cn(timelineDotVariants({ size: dotSize || size, variant: dotVariant }))}>
          {dot}
        </div>
        {!isLast && (
          <div 
            className={cn(
              timelineConnectorVariants({ 
                orientation, 
                variant: connectorVariant 
              })
            )} 
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
);
TimelineItem.displayName = "TimelineItem";

const TimelineContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1", className)}
    {...props}
  />
));
TimelineContent.displayName = "TimelineContent";

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
      variant?: VariantProps<typeof timelineDotVariants>['variant'];
      actions?: React.ReactNode;
    }>;
  }>;
  className?: string;
  size?: VariantProps<typeof timelineVariants>['size'];
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
              isLast={groupIndex === groups.length - 1 && itemIndex === group.items.length - 1}
            >
              <TimelineContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <TimelineTitle>{item.title}</TimelineTitle>
                    {item.description && (
                      <TimelineDescription>{item.description}</TimelineDescription>
                    )}
                    {item.time && <TimelineTime>{item.time}</TimelineTime>}
                  </div>
                  {item.actions && (
                    <div className="flex-shrink-0 ml-2">
                      {item.actions}
                    </div>
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
  type: 'birth' | 'vaccination' | 'health_check' | 'breeding' | 'show' | 'achievement' | 'other';
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
    const getEventIcon = (type: PetTimelineEvent['type']) => {
      switch (type) {
        case 'birth':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          );
        case 'vaccination':
          return (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          );
        case 'health_check':
          return (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          );
        case 'breeding':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          );
        case 'show':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          );
        case 'achievement':
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          );
        default:
          return (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          );
      }
    };

    const getEventVariant = (type: PetTimelineEvent['type']): VariantProps<typeof timelineDotVariants>['variant'] => {
      switch (type) {
        case 'birth':
        case 'achievement':
          return 'success';
        case 'vaccination':
        case 'health_check':
          return 'primary';
        case 'breeding':
          return 'filled';
        case 'show':
          return 'warning';
        default:
          return 'default';
      }
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)}>
        {petName && (
          <div className="text-lg font-semibold">
            {petName}'s Life Timeline
          </div>
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
                <TimelineTime>{new Date(event.date).toLocaleDateString()}</TimelineTime>
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
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineTitle,
  TimelineDescription,
  TimelineTime,
  GroupedTimeline,
  PetLifeTimeline,
  timelineVariants,
  timelineItemVariants,
  timelineDotVariants,
  timelineConnectorVariants,
  type PetTimelineEvent,
};