import defaultAvatar from "@/assets/images/pettypes/dog.jpeg";
import { Button } from "@ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { MoreVertical, Pencil } from "lucide-react";

interface AvatarOutletProps {
  avatarUrl?: string;
  avatarSize?: number;
  onEdit?: () => void;
  onMoreOptions?: () => void;
}

/**
 * AvatarOutlet - Avatar display with action buttons
 *
 * EXACT COPY from Angular: libs/schema/ui/template/avatar/avatar-outlet.component.ts
 * Shows circular avatar with Edit and More options buttons
 * Positioned with -mt-32 to overlap cover
 */
export function AvatarOutlet({
  avatarUrl = defaultAvatar,
  avatarSize = 176,
  onEdit,
  onMoreOptions,
}: AvatarOutletProps) {
  return (
    <div className="-mt-32 flex flex-auto items-end relative pb-3 top-0 z-30 px-6 pointer-events-none">
      {/* Avatar */}
      <div
        className="rounded-full border-2 pointer-events-auto"
        style={{
          height: `${avatarSize}px`,
          width: `${avatarSize}px`,
        }}
      >
        <div className="flex size-full items-center justify-center overflow-hidden rounded-full border border-surface-border ring-4 ring-card-ground">
          <img
            className="size-full object-cover"
            src={avatarUrl}
            alt="avatar"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-1 ml-auto flex gap-2 pointer-events-auto">
        {/* Edit button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline-secondary"
              className="rounded-full h-[2.6rem] px-4 text-base font-semibold"
              onClick={onEdit}
              type="button"
            >
              <Pencil size={16} />
              <span className="ml-2">Edit</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Edit</TooltipContent>
        </Tooltip>

        {/* More options button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost-secondary"
              className="size-[2.6rem] rounded-full p-0"
              onClick={onMoreOptions}
              type="button"
            >
              <MoreVertical size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">More options</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
