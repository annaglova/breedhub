import { EntityTabCardWrapper } from "@/components/space/EntityTabCardWrapper";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@ui/lib/utils";

// Connected entity types
type ConnectedEntityType = 'pet' | 'contact' | 'breed' | 'litter' | 'project' | 'account';

interface ConnectedEntity {
  id?: string;
  name?: string;
  avatar_url?: string;
  slug?: string;
}

interface NoteEntity {
  id: string;
  name?: string; // Note text content
  created_at?: string;
  entity_schema_name?: ConnectedEntityType;
  // Connected entities
  pet?: ConnectedEntity;
  contact?: ConnectedEntity;
  breed?: ConnectedEntity;
  litter?: ConnectedEntity;
  project?: ConnectedEntity;
  account?: ConnectedEntity;
  [key: string]: any;
}

interface NoteTabCardProps {
  entity: NoteEntity;
  selected?: boolean;
  onClick?: () => void;
  onEdit?: (entity: NoteEntity) => void;
  onDelete?: (entity: NoteEntity) => void;
  mode?: 'space' | 'card';
}

/**
 * Format date to locale string
 */
function formatDate(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Get connected entity based on entity_schema_name
 */
function getConnectedEntity(entity: NoteEntity): ConnectedEntity | null {
  const schemaName = entity.entity_schema_name;
  if (!schemaName) return null;

  switch (schemaName) {
    case 'pet':
      return entity.pet || null;
    case 'contact':
      return entity.contact || null;
    case 'breed':
      return entity.breed || null;
    case 'litter':
      return entity.litter || null;
    case 'project':
      return entity.project || null;
    case 'account':
      return entity.account || null;
    default:
      return null;
  }
}

/**
 * Get first letter for avatar placeholder
 */
function getInitial(name?: string): string {
  return name?.charAt(0)?.toUpperCase() || '?';
}

export function NoteTabCard({
  entity,
  selected = false,
  onClick,
  onEdit,
  onDelete,
  mode = 'space',
}: NoteTabCardProps) {
  const connectedEntity = getConnectedEntity(entity);
  const formattedDate = formatDate(entity.created_at);
  const noteText = entity.name || '';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(entity);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(entity);
  };

  return (
    <EntityTabCardWrapper selected={selected} onClick={onClick}>
      {/* Note content area */}
      <div className="bg-slate-50/50 flex h-[206px] overflow-auto rounded-xl border border-surface-border px-7 py-5 text-start text-sm text-slate-700">
        {noteText}
      </div>

      {/* Footer area */}
      <div
        className={cn(
          "mt-2.5 flex w-full items-center px-2",
          mode === 'space' && "h-13"
        )}
      >
        {mode === 'space' && (
          <>
            {/* Avatar */}
            {connectedEntity && (
              <div className="relative flex">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border outline outline-2 outline-offset-2 outline-slate-300">
                  {connectedEntity.avatar_url ? (
                    <img
                      className="size-full object-cover"
                      src={connectedEntity.avatar_url}
                      alt={connectedEntity.name || 'Avatar'}
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full bg-gray-200 text-lg uppercase text-gray-600">
                      {getInitial(connectedEntity.name || noteText)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Name and date */}
            <div
              className="ml-3 flex w-full flex-col space-y-0.5 truncate"
              title={connectedEntity?.name}
            >
              <div className="w-auto truncate">
                {connectedEntity?.slug ? (
                  <Link
                    to={`/${connectedEntity.slug}`}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {connectedEntity.name}
                  </Link>
                ) : (
                  <span className="text-slate-700">
                    {connectedEntity?.name || 'Without subject'}
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-sm">
                {formattedDate}
              </span>
            </div>
          </>
        )}

        {mode === 'card' && (
          <span className="text-slate-500 text-sm">{formattedDate}</span>
        )}

        {/* Action buttons */}
        <div className="text-slate-400 ml-auto flex space-x-3">
          <button
            aria-label="Edit"
            onClick={handleEdit}
            className="hover:text-slate-600 transition-colors"
          >
            <Pencil className="size-4" />
          </button>
          <button
            aria-label="Delete"
            onClick={handleDelete}
            className="hover:text-red-500 transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </EntityTabCardWrapper>
  );
}
