import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@ui/lib/utils";
import { Button } from "@ui/components/button";

interface BackButtonProps {
  to?: string;
  label?: string;
  variant?: "text" | "button" | "icon";
  className?: string;
  onClick?: () => void;
}

export function BackButton({ 
  to, 
  label = "Back", 
  variant = "text",
  className,
  onClick 
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center w-10 h-10 rounded-full",
          "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
          "transition-all duration-200 focus:outline-none focus:ring-2",
          "focus:ring-primary-500/20 focus:ring-offset-2",
          className
        )}
        aria-label={label}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        className={cn("", className)}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        {label}
      </Button>
    );
  }

  // Default "text" variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center text-sm font-medium",
        "text-gray-600 hover:text-gray-900",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/20 rounded",
        className
      )}
    >
      <ChevronLeft className="w-4 h-4 mr-1" />
      {label}
    </button>
  );
}