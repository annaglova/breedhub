import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/lib/utils";

const tableVariants = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      variant: {
        default: "border-collapse",
        bordered: "border border-border",
        striped: "",
      },
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TableProps
  extends React.HTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn(tableVariants({ variant, size }), className)}
        {...props}
      />
    </div>
  )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const tableRowVariants = cva(
  "border-b transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-muted/50 data-[state=selected]:bg-muted",
        clickable: "hover:bg-muted/50 cursor-pointer data-[state=selected]:bg-muted",
        striped: "even:bg-muted/20 hover:bg-muted/50 data-[state=selected]:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface TableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement>,
    VariantProps<typeof tableRowVariants> {}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, variant, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(tableRowVariants({ variant }), className)}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

const tableCellVariants = cva(
  "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
  {
    variants: {
      variant: {
        default: "",
        head: "h-10 px-2 text-left align-middle font-medium text-muted-foreground",
        numeric: "text-right font-mono",
        center: "text-center",
      },
      size: {
        sm: "p-1 text-xs",
        default: "p-2 text-sm",
        lg: "p-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TableHeadProps
  extends React.HTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableCellVariants> {}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, variant = "head", size, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(tableCellVariants({ variant, size }), className)}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

interface TableCellProps
  extends React.HTMLAttributes<HTMLTableCellElement>,
    VariantProps<typeof tableCellVariants> {}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, variant, size, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(tableCellVariants({ variant, size }), className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

// Loading state component
const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <Table>
    <TableHeader>
      <TableRow>
        {Array.from({ length: columns }).map((_, i) => (
          <TableHead key={i}>
            <div className="h-4 bg-muted animate-pulse rounded" />
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 bg-muted animate-pulse rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// Empty state component
const TableEmpty = ({ 
  message = "No data available",
  columns,
  children
}: { 
  message?: string;
  columns: number;
  children?: React.ReactNode;
}) => (
  <TableRow>
    <TableCell colSpan={columns} className="h-24 text-center">
      {children || (
        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm">{message}</p>
        </div>
      )}
    </TableCell>
  </TableRow>
);

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableSkeleton,
  TableEmpty,
  tableVariants,
  tableRowVariants,
  tableCellVariants,
};