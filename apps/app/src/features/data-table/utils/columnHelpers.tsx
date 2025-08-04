import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@ui/components/badge';
import { Checkbox } from '@ui/components/checkbox';
import { Avatar } from '@ui/components/avatar';
import { DataTableColumnHeader } from '../components/DataTableColumnHeader';
import { formatDate, formatDateTime } from '@/shared/utils';
import { Image } from 'lucide-react';

// Selection column helper
export function createSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

// Avatar column helper
export function createAvatarColumn<TData>(
  accessorKey: keyof TData,
  nameAccessor?: keyof TData
): ColumnDef<TData> {
  return {
    id: 'avatar',
    header: '',
    cell: ({ row }) => {
      const imageUrl = row.getValue(accessorKey as string) as string;
      const name = nameAccessor ? (row.getValue(nameAccessor as string) as string) : '';
      
      return (
        <Avatar className="h-8 w-8">
          {imageUrl ? (
            <img src={imageUrl} alt={name} />
          ) : (
            <div className="flex items-center justify-center bg-muted">
              <Image className="h-4 w-4" />
            </div>
          )}
        </Avatar>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}

// Text column helper
export function createTextColumn<TData>(
  accessorKey: keyof TData,
  title: string,
  options?: {
    sortable?: boolean;
    hideable?: boolean;
    bold?: boolean;
    truncate?: boolean;
  }
): ColumnDef<TData> {
  const { sortable = true, hideable = true, bold = false, truncate = false } = options || {};
  
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const value = row.getValue(accessorKey as string) as string;
      return (
        <div className={`
          ${bold ? 'font-medium' : ''}
          ${truncate ? 'truncate max-w-[200px]' : ''}
        `}>
          {value || 'N/A'}
        </div>
      );
    },
    enableSorting: sortable,
    enableHiding: hideable,
  };
}

// Badge column helper
export function createBadgeColumn<TData>(
  accessorKey: keyof TData,
  title: string,
  options?: {
    sortable?: boolean;
    hideable?: boolean;
    variantMap?: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>;
    filterFn?: boolean;
  }
): ColumnDef<TData> {
  const { 
    sortable = true, 
    hideable = true, 
    variantMap = {}, 
    filterFn = true 
  } = options || {};
  
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const value = row.getValue(accessorKey as string) as string;
      const variant = variantMap[value] || 'default';
      
      return (
        <Badge variant={variant}>
          {value}
        </Badge>
      );
    },
    filterFn: filterFn ? (row, id, value) => {
      return value.includes(row.getValue(id));
    } : undefined,
    enableSorting: sortable,
    enableHiding: hideable,
  };
}

// Date column helper
export function createDateColumn<TData>(
  accessorKey: keyof TData,
  title: string,
  options?: {
    sortable?: boolean;
    hideable?: boolean;
    includeTime?: boolean;
    format?: 'date' | 'datetime' | 'relative';
  }
): ColumnDef<TData> {
  const { 
    sortable = true, 
    hideable = true, 
    includeTime = false,
    format = 'date'
  } = options || {};
  
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const date = row.getValue(accessorKey as string) as Date;
      if (!date) return <span className="text-muted-foreground">N/A</span>;
      
      switch (format) {
        case 'datetime':
          return formatDateTime(date);
        case 'relative':
          return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
            Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            'day'
          );
        default:
          return includeTime ? formatDateTime(date) : formatDate(date);
      }
    },
    enableSorting: sortable,
    enableHiding: hideable,
  };
}

// Number column helper
export function createNumberColumn<TData>(
  accessorKey: keyof TData,
  title: string,
  options?: {
    sortable?: boolean;
    hideable?: boolean;
    format?: 'number' | 'currency' | 'percentage';
    precision?: number;
    currency?: string;
  }
): ColumnDef<TData> {
  const { 
    sortable = true, 
    hideable = true, 
    format = 'number',
    precision = 0,
    currency = 'USD'
  } = options || {};
  
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const value = row.getValue(accessorKey as string) as number;
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground">N/A</span>;
      }
      
      switch (format) {
        case 'currency':
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: precision,
          }).format(value);
        case 'percentage':
          return new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: precision,
          }).format(value / 100);
        default:
          return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          }).format(value);
      }
    },
    enableSorting: sortable,
    enableHiding: hideable,
  };
}

// Boolean column helper
export function createBooleanColumn<TData>(
  accessorKey: keyof TData,
  title: string,
  options?: {
    sortable?: boolean;
    hideable?: boolean;
    trueLabel?: string;
    falseLabel?: string;
    trueVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    falseVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  }
): ColumnDef<TData> {
  const { 
    sortable = true, 
    hideable = true,
    trueLabel = 'Yes',
    falseLabel = 'No',
    trueVariant = 'default',
    falseVariant = 'secondary'
  } = options || {};
  
  return {
    accessorKey: accessorKey as string,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: ({ row }) => {
      const value = row.getValue(accessorKey as string) as boolean;
      
      return (
        <Badge variant={value ? trueVariant : falseVariant}>
          {value ? trueLabel : falseLabel}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    enableSorting: sortable,
    enableHiding: hideable,
  };
}