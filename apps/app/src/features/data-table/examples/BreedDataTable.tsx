import React from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/components/badge';
import { Button } from '@ui/components/button';
import { Plus, Dog, Cat } from 'lucide-react';
import { 
  DataTable, 
  DataTableRowActions, 
  DataTableColumnHeader,
  commonRowActions, 
  type RowAction,
  createAvatarColumn,
  createTextColumn,
  createBadgeColumn,
  createNumberColumn,
} from '../index';
import { type Breed } from '@/domain/entities/breed';

interface BreedDataTableProps {
  breeds: Breed[];
  isLoading?: boolean;
  onEditBreed?: (breed: Breed) => void;
  onDeleteBreed?: (breed: Breed) => void;
  onViewBreed?: (breed: Breed) => void;
}

const getPetTypeIcon = (petType: string) => {
  switch (petType) {
    case 'dog':
      return <Dog className="h-4 w-4" />;
    case 'cat':
      return <Cat className="h-4 w-4" />;
    default:
      return null;
  }
};

export function BreedDataTable({
  breeds,
  isLoading = false,
  onEditBreed,
  onDeleteBreed,
  onViewBreed,
}: BreedDataTableProps) {
  const columns: ColumnDef<Breed>[] = [
    createAvatarColumn('photo_url', 'name'),
    createTextColumn('name', 'Breed Name', { bold: true }),
    {
      accessorKey: 'authentic_name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Authentic Name" />
      ),
      cell: ({ row }) => {
        const name = row.getValue('authentic_name') as string;
        return name ? (
          <span className="text-muted-foreground italic">{name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'pet_type_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const petType = row.getValue('pet_type_id') as string;
        return (
          <div className="flex items-center gap-2">
            {getPetTypeIcon(petType)}
            <Badge variant="outline" className="capitalize">
              {petType}
            </Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'bred_for',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Bred For" />
      ),
      cell: ({ row }) => {
        const bredFor = row.getValue('bred_for') as string;
        return bredFor ? (
          <span className="text-sm">{bredFor}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: 'statistics',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Avg Weight" />
      ),
      cell: ({ row }) => {
        const stats = row.getValue('statistics') as Breed['statistics'];
        if (!stats) return <span className="text-muted-foreground">-</span>;
        
        const avgWeight = (stats.avgWeightMin + stats.avgWeightMax) / 2;
        return (
          <span className="text-sm">
            {avgWeight.toFixed(1)} kg
          </span>
        );
      },
    },
    {
      accessorKey: 'statistics.avgLifespan',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lifespan" />
      ),
      cell: ({ row }) => {
        const stats = row.original.statistics;
        if (!stats?.avgLifespan) return <span className="text-muted-foreground">-</span>;
        
        return (
          <span className="text-sm">
            {stats.avgLifespan} years
          </span>
        );
      },
    },
    {
      accessorKey: 'registration_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Registered" />
      ),
      cell: ({ row }) => {
        const count = row.getValue('registration_count') as number;
        return (
          <Badge variant="secondary">
            {count || 0}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const actions: RowAction<Breed>[] = [];
        
        if (onViewBreed) {
          actions.push(commonRowActions.view(onViewBreed));
        }
        
        if (onEditBreed) {
          actions.push(commonRowActions.edit(onEditBreed));
        }
        
        if (onDeleteBreed) {
          actions.push({
            ...commonRowActions.delete(onDeleteBreed),
            confirmDialog: {
              title: 'Delete breed',
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
      Add Breed
    </Button>
  );

  return (
    <DataTable
      data={breeds}
      columns={columns}
      isLoading={isLoading}
      searchPlaceholder="Search breeds by name..."
      emptyStateTitle="No breeds found"
      emptyStateDescription="Start by adding breed information to the system."
      emptyStateAction={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add First Breed
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