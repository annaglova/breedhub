import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib/utils";
import { MoreVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { appStore, routeStore } from "@breedhub/rxdb-store";
import type { IconConfig } from "@breedhub/rxdb-store";
import { Icon } from "@/components/shared/Icon";

/**
 * Menu item from config
 */
interface ConfigMenuItem {
  id: string;
  label: string;
  icon?: IconConfig;
  action: string;
  order: number;
  model?: string;
}

/**
 * Resolved route info for SmartLink
 */
interface ResolvedInfo {
  entity: string;
  entityId: string;
  model: string;
}

/**
 * Props for SmartLink component
 */
interface SmartLinkProps {
  /** URL to navigate to (slug-based, e.g. "/affenpinscher") */
  to: string;
  /** Display text (children) */
  children: React.ReactNode;
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
 * Extract slug from URL path (remove leading slash)
 */
function extractSlug(to: string): string {
  return to.startsWith("/") ? to.slice(1) : to;
}

/**
 * Get menu items from app config for a given entity, filtered by model
 */
function getMenuItemsForModel(entity: string, model: string): ConfigMenuItem[] {
  const config = appStore.appConfig.value;
  if (!config?.data?.entities) return [];

  // Find schema with matching entitySchemaName
  const schema = Object.values(config.data.entities as Record<string, any>).find(
    (s: any) => s.entitySchemaName === entity
  );

  if (!schema?.menus) return [];

  // Collect all items from all menu configs, filtered by model
  const items: ConfigMenuItem[] = [];

  for (const [, menuConfig] of Object.entries(schema.menus as Record<string, any>)) {
    if (!menuConfig?.items) continue;

    for (const [itemId, item] of Object.entries(menuConfig.items as Record<string, any>)) {
      // Filter by model: item matches if it has no model (universal) or model matches
      if (item.model && item.model !== model) continue;

      items.push({
        id: itemId,
        label: item.label,
        icon: item.icon,
        action: item.action,
        order: item.order ?? 0,
        model: item.model,
      });
    }
  }

  // Sort by order
  items.sort((a, b) => a.order - b.order);
  return items;
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
 * SmartLink - Link component with config-driven context menu
 *
 * Automatically resolves entity type and model from the slug URL via routeStore,
 * then displays menu items from app config filtered by model.
 *
 * @example
 * ```tsx
 * <SmartLink to="/test-pet" rows={2}>
 *   Champion Golden Thunder of Excellence
 * </SmartLink>
 * ```
 */
export function SmartLink({
  to,
  children,
  rows = 1,
  showTooltip = true,
  className,
  disableActions = false,
}: SmartLinkProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [resolved, setResolved] = useState<ResolvedInfo | null>(null);
  const [menuItems, setMenuItems] = useState<ConfigMenuItem[]>([]);

  // Resolve slug → entity + model via routeStore
  useEffect(() => {
    if (disableActions) return;

    const slug = extractSlug(to);
    if (!slug) return;

    let cancelled = false;

    routeStore.resolveRoute(slug).then((route) => {
      if (cancelled) return;

      if (route) {
        setResolved({
          entity: route.entity,
          entityId: route.entity_id,
          model: route.model,
        });

        // Get menu items filtered by model
        const items = getMenuItemsForModel(route.entity, route.model);
        setMenuItems(items);
      }
    });

    return () => { cancelled = true; };
  }, [to, disableActions]);

  const hasActions = !disableActions && resolved && menuItems.length > 0;

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

  const handleMenuItemClick = useCallback(
    (item: ConfigMenuItem, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // TODO: implement action handlers
      console.log(`[SmartLink] Action: ${item.action}`, {
        entity: resolved?.entity,
        model: resolved?.model,
        entityId: resolved?.entityId,
        item,
      });
    },
    [resolved]
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
  if (!hasActions) {
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
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={(e) => handleMenuItemClick(item, e)}
              className="cursor-pointer"
            >
              {item.icon && (
                <Icon icon={item.icon} size={16} className="h-4 w-4 shrink-0" />
              )}
              <span className={item.icon ? "ml-2" : ""}>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
