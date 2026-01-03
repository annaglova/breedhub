import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@ui/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

export function Breadcrumb({ items, className, showHome = true }: BreadcrumbProps) {
  const allItems = showHome 
    ? [{ label: "Home", href: "/" }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center space-x-1 text-sm", className)}>
      {allItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="mx-1 h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
          
          {item.href && !item.current ? (
            <Link
              to={item.href}
              className="text-slate-500 hover:text-slate-700 transition-colors"
            >
              {index === 0 && showHome ? (
                <Home className="h-4 w-4" aria-hidden="true" />
              ) : (
                item.label
              )}
            </Link>
          ) : (
            <span
              className={cn(
                "font-medium",
                item.current ? "text-slate-900" : "text-slate-500"
              )}
              aria-current={item.current ? "page" : undefined}
            >
              {index === 0 && showHome ? (
                <Home className="h-4 w-4" aria-hidden="true" />
              ) : (
                item.label
              )}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}