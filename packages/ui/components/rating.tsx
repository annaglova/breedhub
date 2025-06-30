"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const ratingVariants = cva(
  "flex items-center gap-1",
  {
    variants: {
      size: {
        xs: "text-xs",
        sm: "text-sm", 
        default: "text-base",
        lg: "text-lg",
        xl: "text-xl",
      },
      variant: {
        default: "text-yellow-400",
        secondary: "text-muted-foreground",
        success: "text-green-500",
        warning: "text-yellow-500",
        destructive: "text-red-500",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

interface RatingProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ratingVariants> {
  value: number;
  max?: number;
  precision?: number;
  readonly?: boolean;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  allowHover?: boolean;
  emptyIcon?: React.ReactNode;
  filledIcon?: React.ReactNode;
  halfIcon?: React.ReactNode;
  onRatingChange?: (rating: number) => void;
}

const StarIcon = ({ filled = false, half = false, className }: { 
  filled?: boolean; 
  half?: boolean; 
  className?: string; 
}) => (
  <svg
    className={cn("w-4 h-4", className)}
    fill={filled || half ? "currentColor" : "none"}
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1}
  >
    {half ? (
      <defs>
        <linearGradient id="half-fill">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
    ) : null}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
      fill={half ? "url(#half-fill)" : undefined}
    />
  </svg>
);

const Rating = React.forwardRef<HTMLDivElement, RatingProps>(
  ({ 
    className,
    value,
    max = 5,
    precision = 1,
    readonly = true,
    showValue = false,
    showCount = false,
    count,
    allowHover = false,
    size,
    variant,
    emptyIcon,
    filledIcon,
    halfIcon,
    onRatingChange,
    ...props 
  }, ref) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);
    const isInteractive = !readonly && onRatingChange;
    
    const displayValue = hoverValue !== null ? hoverValue : value;
    
    const handleStarClick = (starValue: number) => {
      if (!isInteractive) return;
      onRatingChange?.(starValue);
    };
    
    const handleStarHover = (starValue: number) => {
      if (!isInteractive || !allowHover) return;
      setHoverValue(starValue);
    };
    
    const handleMouseLeave = () => {
      if (!isInteractive || !allowHover) return;
      setHoverValue(null);
    };

    const renderStar = (index: number) => {
      const starValue = index + 1;
      const filled = displayValue >= starValue;
      const half = precision === 0.5 && displayValue >= starValue - 0.5 && displayValue < starValue;
      
      let icon = <StarIcon filled={filled} half={half} />;
      
      if (filled && filledIcon) icon = filledIcon;
      else if (half && halfIcon) icon = halfIcon;
      else if (!filled && !half && emptyIcon) icon = emptyIcon;
      
      return (
        <span
          key={index}
          className={cn(
            "cursor-pointer transition-colors",
            filled || half ? "text-current" : "text-muted-foreground/40",
            !isInteractive && "cursor-default",
            isInteractive && "hover:scale-110 transition-transform"
          )}
          onClick={() => handleStarClick(starValue)}
          onMouseEnter={() => handleStarHover(starValue)}
        >
          {icon}
        </span>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(ratingVariants({ size, variant }), className)}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max }, (_, index) => renderStar(index))}
        </div>
        
        {(showValue || showCount) && (
          <div className="flex items-center gap-1 ml-2 text-sm text-muted-foreground">
            {showValue && (
              <span className="font-medium">
                {value.toFixed(precision === 0.5 ? 1 : 0)}
                {max !== 5 && ` / ${max}`}
              </span>
            )}
            {showCount && count !== undefined && (
              <span>
                ({count.toLocaleString()} {count === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);
Rating.displayName = "Rating";

// Rating Input Component for forms
interface RatingInputProps extends Omit<RatingProps, 'readonly' | 'value'> {
  name?: string;
  value?: number;
  defaultValue?: number;
  required?: boolean;
  disabled?: boolean;
}

const RatingInput = React.forwardRef<HTMLDivElement, RatingInputProps>(
  ({ 
    name,
    value: controlledValue,
    defaultValue = 0,
    onRatingChange,
    disabled = false,
    required = false,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    
    const handleRatingChange = (newRating: number) => {
      if (disabled) return;
      
      if (controlledValue === undefined) {
        setInternalValue(newRating);
      }
      onRatingChange?.(newRating);
    };

    return (
      <>
        <Rating
          ref={ref}
          value={value}
          readonly={false}
          allowHover={true}
          onRatingChange={handleRatingChange}
          className={cn(disabled && "opacity-50 cursor-not-allowed")}
          {...props}
        />
        {name && (
          <input
            type="hidden"
            name={name}
            value={value}
            required={required}
          />
        )}
      </>
    );
  }
);
RatingInput.displayName = "RatingInput";

// Rating Summary Component
interface RatingSummaryProps {
  ratings: Array<{ stars: number; count: number }>;
  totalReviews: number;
  averageRating: number;
  className?: string;
}

const RatingSummary = React.forwardRef<HTMLDivElement, RatingSummaryProps>(
  ({ ratings, totalReviews, averageRating, className }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Rating value={averageRating} showValue precision={0.1} />
          <span className="text-sm text-muted-foreground">
            ({totalReviews.toLocaleString()} reviews)
          </span>
        </div>
        
        <div className="space-y-1">
          {ratings.map((rating) => {
            const percentage = totalReviews > 0 ? (rating.count / totalReviews) * 100 : 0;
            
            return (
              <div key={rating.stars} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-muted-foreground">{rating.stars}</span>
                <StarIcon filled className="w-3 h-3 text-yellow-400" />
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-muted-foreground text-right">
                  {rating.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
RatingSummary.displayName = "RatingSummary";

export { 
  Rating, 
  RatingInput, 
  RatingSummary,
  StarIcon,
  ratingVariants,
};