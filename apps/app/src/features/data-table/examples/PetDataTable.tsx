import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge, Avatar, Button } from 'ui';
import { 
  DataTable, 
  DataTableRowActions, 
  commonRowActions, 
  type RowAction,
  createAvatarColumn,
  createTextColumn,
  createBadgeColumn,
  createDateColumn,
} from '../index';
import { type Pet } from '@/domain/entities/pet';
import { formatDate } from '@/shared/utils';

interface PetDataTableProps {
  pets: Pet[];
  isLoading?: boolean;
  onEditPet?: (pet: Pet) => void;
  onDeletePet?: (pet: Pet) => void;
  onViewPet?: (pet: Pet) => void;
}

const getPetStatusVariant = (status: Pet['status']) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'inactive':
      return 'secondary';
    case 'deceased':
      return 'destructive';
    case 'sold':
      return 'outline';
    default:
      return 'secondary';
  }
};

export function PetDataTable({
  pets,
  isLoading = false,
  onEditPet,
  onDeletePet,
  onViewPet,
}: PetDataTableProps) {
  const columns: ColumnDef<Pet>[] = [
    createAvatarColumn('photoUrl', 'name'),
    createTextColumn('name', 'Name', { bold: true }),
    {
      accessorKey: 'breed',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Breed" />
      ),
      cell: ({ row }) => row.original.breed?.name || 'Unknown',
      filterFn: (row, id, value) => {
        return value.includes(row.original.breed?.name || '');
      },
    },
    {
      accessorKey: 'gender',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gender" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('gender')}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'dateOfBirth',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date of Birth" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('dateOfBirth') as Date;
        return date ? formatDate(date) : 'Unknown';
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as Pet['status'];
        return (
          <Badge variant={getPetStatusVariant(status)}>
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'microchipNumber',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Microchip" />
      ),
      cell: ({ row }) => {
        const microchip = row.getValue('microchipNumber') as string;
        return microchip ? (
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            {microchip}
          </code>
        ) : (
          <span className="text-muted-foreground">None</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const actions: RowAction<Pet>[] = [];
        
        if (onViewPet) {
          actions.push(commonRowActions.view(onViewPet));
        }
        
        if (onEditPet) {
          actions.push(commonRowActions.edit(onEditPet));
        }
        
        if (onDeletePet) {
          actions.push({
            ...commonRowActions.delete(onDeletePet),
            confirmDialog: {
              title: 'Delete pet',
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
      <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Add Pet
    </Button>
  );

  return (
    <DataTable
      data={pets}
      columns={columns}
      isLoading={isLoading}
      searchPlaceholder="Search pets by name, breed, or microchip..."
      emptyStateTitle="No pets found"
      emptyStateDescription="Start by adding your first pet to the system."
      emptyStateAction={
        <Button>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add First Pet
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