import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Plus, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { 
  DataTable, 
  DataTableRowActions, 
  DataTableColumnHeader,
  commonRowActions, 
  type RowAction,
  createAvatarColumn,
  createTextColumn,
  createBadgeColumn,
  createDateColumn,
} from '../index';
import { type Kennel } from '@/domain/entities/kennel';
import { formatDate } from '@/shared/utils';

interface KennelDataTableProps {
  kennels: Kennel[];
  isLoading?: boolean;
  onEditKennel?: (kennel: Kennel) => void;
  onDeleteKennel?: (kennel: Kennel) => void;
  onViewKennel?: (kennel: Kennel) => void;
}

export function KennelDataTable({
  kennels,
  isLoading = false,
  onEditKennel,
  onDeleteKennel,
  onViewKennel,
}: KennelDataTableProps) {
  const columns: ColumnDef<Kennel>[] = [
    createAvatarColumn('logo_url', 'name'),
    createTextColumn('name', 'Kennel Name', { bold: true }),
    {
      accessorKey: 'prefix',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Prefix" />
      ),
      cell: ({ row }) => {
        const prefix = row.getValue('prefix') as string;
        return prefix ? (
          <code className="text-sm bg-muted px-2 py-1 rounded">{prefix}</code>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'country',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Country" />
      ),
      cell: ({ row }) => {
        const country = row.original.country;
        return country ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{country.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'breed_specializations',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Specializations" />
      ),
      cell: ({ row }) => {
        const breeds = row.original.breeds || [];
        if (breeds.length === 0) {
          return <span className="text-muted-foreground">None</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {breeds.slice(0, 2).map((breed) => (
              <Badge key={breed.id} variant="secondary" className="text-xs">
                {breed.name}
              </Badge>
            ))}
            {breeds.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{breeds.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'is_verified',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Verified" />
      ),
      cell: ({ row }) => {
        const isVerified = row.getValue('is_verified') as boolean;
        return isVerified ? (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Unverified</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
    },
    {
      accessorKey: 'rating',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rating" />
      ),
      cell: ({ row }) => {
        const rating = row.getValue('rating') as number;
        if (!rating) return <span className="text-muted-foreground">-</span>;
        
        return (
          <Badge variant={rating >= 90 ? 'default' : rating >= 70 ? 'secondary' : 'outline'}>
            {rating}%
          </Badge>
        );
      },
    },
    {
      accessorKey: 'established_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Established" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('established_date') as string;
        if (!date) return <span className="text-muted-foreground">-</span>;
        
        const year = new Date(date).getFullYear();
        return <span className="text-sm">{year}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const actions: RowAction<Kennel>[] = [];
        
        if (onViewKennel) {
          actions.push(commonRowActions.view(onViewKennel));
        }
        
        if (onEditKennel) {
          actions.push(commonRowActions.edit(onEditKennel));
        }
        
        if (onDeleteKennel) {
          actions.push({
            ...commonRowActions.delete(onDeleteKennel),
            confirmDialog: {
              title: 'Delete kennel',
              description: `Are you sure you want to delete ${row.original.name}? This action cannot be undone.`,
              actionLabel: 'Delete',
              cancelLabel: 'Cancel',
            },
          });
        }
        
        return <DataTableRowActions row={row} actions={actions} />;
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];

  const toolbarActions = (
    <Button size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Kennel
    </Button>
  );

  return (
    <DataTable
      data={kennels}
      columns={columns}
      isLoading={isLoading}
      searchPlaceholder="Search kennels by name or prefix..."
      emptyStateTitle="No kennels found"
      emptyStateDescription="Start by registering your kennel."
      emptyStateAction={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Register Kennel
        </Button>
      }
      toolbarActions={toolbarActions}
      showSelection
      selectionActions={
        <Button variant="destructive" size="sm">
          Delete Selected
        </Button>
      }
      enableSorting
      enableFiltering
      enableColumnFilters
      pageSize={20}
      pageSizeOptions={[10, 20, 50, 100]}
    />
  );
}