import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import {
  ExternalLink,
  GitBranch,
  MoreVertical,
  Scale,
  Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Entity types supported by SmartLink
 */
export type SmartLinkEntityType =
  | "pet"
  | "breed"
  | "kennel"
  | "contact"
  | "litter";

/**
 * Quick action definition
 */
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (entityId: string) => void;
  dividerAfter?: boolean;
}

/**
 * Props for SmartLink component
 */
interface SmartLinkProps {
  /** URL to navigate to */
  to: string;
  /** Display text (children) */
  children: React.ReactNode;
  /** Entity type for quick actions menu */
  entityType?: SmartLinkEntityType;
  /** Entity ID for quick actions */
  entityId?: string;
  /** Number of text rows before truncation (default: 1) */
  rows?: 1 | 2 | 3 | 4;
  /** Show tooltip with full text on hover */
  showTooltip?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Disable quick actions menu */
  disableActions?: boolean;
}

/**
 * Get quick actions for entity type
 *
 * TODO: Expand with more actions per entity type
 */
function getQuickActions(entityType: SmartLinkEntityType): QuickAction[] {
  switch (entityType) {
    case "pet":
      return [
        {
          id: "pedigree",
          label: "View pedigree",
          icon: <GitBranch className="h-4 w-4" />,
          onClick: (id) => console.log("[TODO] View pedigree for", id),
        },
        {
          id: "siblings",
          label: "View siblings",
          icon: <Users className="h-4 w-4" />,
          onClick: (id) => console.log("[TODO] View siblings for", id),
        },
        {
          id: "compare",
          label: "Add to comparison",
          icon: <Scale className="h-4 w-4" />,
          onClick: (id) => console.log("[TODO] Add to comparison", id),
          dividerAfter: true,
        },
        {
          id: "open",
          label: "Open in new tab",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: (id) => window.open(`/pet/${id}`, "_blank"),
        },
      ];

    case "breed":
      return [
        {
          id: "open",
          label: "Open in new tab",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: (id) => window.open(`/breed/${id}`, "_blank"),
        },
      ];

    case "kennel":
      return [
        {
          id: "open",
          label: "Open in new tab",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: (id) => window.open(`/kennel/${id}`, "_blank"),
        },
      ];

    case "contact":
      return [
        {
          id: "open",
          label: "Open in new tab",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: (id) => window.open(`/contact/${id}`, "_blank"),
        },
      ];

    case "litter":
      return [
        {
          id: "open",
          label: "Open in new tab",
          icon: <ExternalLink className="h-4 w-4" />,
          onClick: (id) => window.open(`/litter/${id}`, "_blank"),
        },
      ];

    default:
      return [];
  }
}

/**
 * Get CSS classes for text row truncation
 */
function getRowClampClass(rows: number): string {
  switch (rows) {
    case 1:
      return "line-clamp-1";
    case 2:
      return "line-clamp-2";
    case 3:
      return "line-clamp-3";
    case 4:
      return "line-clamp-4";
    default:
      return "line-clamp-1";
  }
}

/**
 * SmartLink - Link component with entity-aware quick actions
 *
 * Features:
 * - Standard link appearance (primary color, hover underline)
 * - Optional quick actions menu (three dots on hover)
 * - Text truncation with configurable row count
 * - Tooltip with full text
 *
 * Based on Angular: libs/schema/ui/link-ui/link/link.component.ts
 *
 * @example
 * ```tsx
 * <SmartLink
 *   to="/pet/123"
 *   entityType="pet"
 *   entityId="123"
 *   rows={2}
 * >
 *   Champion Golden Thunder of Excellence
 * </SmartLink>
 * ```
 */
export function SmartLink({
  to,
  children,
  entityType,
  entityId,
  rows = 1,
  showTooltip = true,
  className,
  disableActions = false,
}: SmartLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const hasActions = !disableActions && entityType && entityId;
  const quickActions = hasActions ? getQuickActions(entityType) : [];
  const showActionsButton = hasActions && quickActions.length > 0;

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    if (!isMenuOpen) {
      setIsHovered(false);
    }
  }, [isMenuOpen]);

  const handleMenuOpenChange = useCallback((open: boolean) => {
    setIsMenuOpen(open);
    if (!open) {
      setIsHovered(false);
    }
  }, []);

  const handleActionClick = useCallback(
    (action: QuickAction, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (entityId) {
        action.onClick(entityId);
      }
    },
    [entityId]
  );

  // Text content for tooltip
  const textContent = typeof children === "string" ? children : undefined;

  const linkElement = (
    <Link
      to={to}
      className={cn(
        "text-primary hover:text-primary-hover",
        getRowClampClass(rows),
        className
      )}
    >
      {children}
    </Link>
  );

  const linkWithTooltip =
    showTooltip && textContent ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{linkElement}</TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{textContent}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      linkElement
    );

  // If no actions, just return the link
  if (!showActionsButton) {
    return linkWithTooltip;
  }

  // With actions: wrap in container with ellipsis button
  return (
    <span
      className="group inline-flex items-center gap-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {linkWithTooltip}

      <DropdownMenu onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "inline-flex h-4 w-4 items-center justify-center rounded text-transparent transition-colors",
              "hover:text-secondary focus:outline-none",
              (isHovered || isMenuOpen) && "text-secondary-400"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[160px]">
          {quickActions.map((action) => (
            <div key={action.id}>
              <DropdownMenuItem
                onClick={(e) => handleActionClick(action, e)}
                className="cursor-pointer"
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </DropdownMenuItem>
              {action.dividerAfter && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
