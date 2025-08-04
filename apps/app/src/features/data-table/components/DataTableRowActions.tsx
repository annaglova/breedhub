import React from 'react';
import { type Row } from '@tanstack/react-table';
import { Edit, Trash2, Eye, Copy } from 'lucide-react';
import { Button } from '@ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/components/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@ui/components/alert-dialog';
import { cn } from '@/shared/utils';

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions?: RowAction<TData>[];
  className?: string;
}

export interface RowAction<TData> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  onClick?: (data: TData) => void;
  disabled?: (data: TData) => boolean;
  hidden?: (data: TData) => boolean;
  confirmDialog?: {
    title: string;
    description: string;
    actionLabel?: string;
    cancelLabel?: string;
  };
}

export function DataTableRowActions<TData>({
  row,
  actions = [],
  className,
}: DataTableRowActionsProps<TData>) {
  const data = row.original;
  const visibleActions = actions.filter(action => !action.hidden?.(data));

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {visibleActions.map((action) => {
        const isDisabled = action.disabled?.(data);
        
        if (action.confirmDialog) {
          return (
            <AlertDialog key={action.id}>
              <AlertDialogTrigger asChild>
                <Button
                  variant={action.variant || 'outline'}
                  size="sm"
                  disabled={isDisabled}
                  className="h-8"
                >
                  {action.icon}
                  <span className="sr-only lg:not-sr-only lg:ml-2">
                    {action.label}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{action.confirmDialog.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {action.confirmDialog.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {action.confirmDialog.cancelLabel || 'Cancel'}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => action.onClick?.(data)}
                    className={action.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                  >
                    {action.confirmDialog.actionLabel || action.label}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        }

        return (
          <Button
            key={action.id}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={() => action.onClick?.(data)}
            disabled={isDisabled}
            className="h-8"
          >
            {action.icon}
            <span className="sr-only lg:not-sr-only lg:ml-2">
              {action.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

// Predefined common row actions
export const commonRowActions = {
  edit: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'edit',
    label: 'Edit',
    variant: 'outline' as const,
    onClick,
    icon: <Edit className="h-4 w-4" />,
  }),

  delete: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'delete',
    label: 'Delete',
    variant: 'destructive' as const,
    onClick,
    icon: <Trash2 className="h-4 w-4" />,
    confirmDialog: {
      title: 'Delete item',
      description: 'Are you sure you want to delete this item? This action cannot be undone.',
      actionLabel: 'Delete',
      cancelLabel: 'Cancel',
    },
  }),

  view: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'view',
    label: 'View',
    variant: 'outline' as const,
    onClick,
    icon: <Eye className="h-4 w-4" />,
  }),

  duplicate: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'duplicate',
    label: 'Duplicate',
    variant: 'outline' as const,
    onClick,
    icon: <Copy className="h-4 w-4" />,
  }),
};