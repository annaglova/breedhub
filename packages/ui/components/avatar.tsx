"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { User } from "lucide-react";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8", 
        default: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
        "3xl": "h-24 w-24",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-md",
        rounded: "rounded-lg",
      },
      ring: {
        none: "",
        sm: "ring-2 ring-background ring-offset-2",
        default: "ring-2 ring-border ring-offset-2",
        lg: "ring-4 ring-border ring-offset-2",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "circle",
      ring: "none",
    },
  }
);

interface AvatarProps
  extends React.ComponentProps<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, shape, ring, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, shape, ring }), className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentProps<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-xl",
        "3xl": "text-2xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

interface AvatarFallbackProps
  extends React.ComponentProps<typeof AvatarPrimitive.Fallback>,
    VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, size, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(avatarFallbackVariants({ size }), className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Utility function to generate initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Enhanced Avatar component with automatic fallback
interface AvatarWithFallbackProps extends AvatarProps {
  src?: string;
  name?: string;
  alt?: string;
}

const AvatarWithFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarWithFallbackProps
>(({ src, name, alt, size, ...props }, ref) => (
  <Avatar ref={ref} size={size} {...props}>
    {src && <AvatarImage src={src} alt={alt || name || "Avatar"} />}
    <AvatarFallback size={size}>
      {name ? getInitials(name) : (
        <User className="h-1/2 w-1/2" />
      )}
    </AvatarFallback>
  </Avatar>
));
AvatarWithFallback.displayName = "AvatarWithFallback";

// Avatar Group component for multiple avatars
interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  shape?: VariantProps<typeof avatarVariants>['shape'];
  children: React.ReactElement<AvatarProps>[];
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, max = 5, size = "default", shape = "circle", children, ...props }, ref) => {
    const avatars = React.Children.toArray(children) as React.ReactElement<AvatarProps>[];
    const visibleAvatars = avatars.slice(0, max);
    const remainingCount = avatars.length - max;
    
    return (
      <div
        ref={ref}
        className={cn("flex -space-x-2", className)}
        {...props}
      >
        {visibleAvatars.map((avatar, index) =>
          React.cloneElement(avatar, {
            key: index,
            size,
            shape,
            ring: "sm",
            className: cn("border-2 border-background", avatar.props.className),
          })
        )}
        {remainingCount > 0 && (
          <Avatar size={size} shape={shape} ring="sm" className="border-2 border-background">
            <AvatarFallback size={size} className="bg-muted text-muted-foreground">
              +{remainingCount}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  }
);
AvatarGroup.displayName = "AvatarGroup";

// Avatar with online/offline status indicator
interface AvatarWithStatusProps extends AvatarWithFallbackProps {
  isOnline?: boolean;
  showStatus?: boolean;
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const statusPositionClasses = {
  'top-right': 'top-0 right-0',
  'bottom-right': 'bottom-0 right-0',
  'top-left': 'top-0 left-0',
  'bottom-left': 'bottom-0 left-0',
};

const AvatarWithStatus = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarWithStatusProps
>(({
  src,
  name,
  alt,
  size = 'default',
  isOnline = true,
  showStatus = true,
  statusPosition = 'top-right',
  className,
  ...props
}, ref) => {
  // Status indicator size based on avatar size
  const statusSizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    default: 'h-3 w-3',
    lg: 'h-3.5 w-3.5',
    xl: 'h-4 w-4',
    '2xl': 'h-5 w-5',
    '3xl': 'h-6 w-6',
  };

  return (
    <div className="relative inline-block">
      <Avatar ref={ref} size={size} className={className} {...props}>
        {src && <AvatarImage src={src} alt={alt || name || "Avatar"} />}
        <AvatarFallback size={size} className="bg-slate-200 text-slate-600">
          {name ? getInitials(name) : (
            <User className="h-1/2 w-1/2" />
          )}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-slate-100",
            statusSizeClasses[size || 'default'],
            statusPositionClasses[statusPosition],
            isOnline ? "bg-green-500" : "bg-slate-400"
          )}
          aria-label={isOnline ? "Online" : "Offline"}
        />
      )}
    </div>
  );
});
AvatarWithStatus.displayName = "AvatarWithStatus";

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWithFallback,
  AvatarWithStatus,
  AvatarGroup,
  avatarVariants,
  getInitials,
};