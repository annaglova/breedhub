import React from 'react';
import { type Row } from '@tanstack/react-table';
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
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  }),

  delete: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'delete',
    label: 'Delete',
    variant: 'destructive' as const,
    onClick,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
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
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  }),

  duplicate: <TData,>(onClick: (data: TData) => void): RowAction<TData> => ({
    id: 'duplicate',
    label: 'Duplicate',
    variant: 'outline' as const,
    onClick,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  }),
};