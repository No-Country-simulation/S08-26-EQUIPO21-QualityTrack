// Primitivos de shadcn/ui (base Radix UI, ver ADR-0013) -- vendorizados en ./base.
export { Alert, AlertAction, AlertDescription, AlertTitle } from './base/alert';
export { Badge, badgeVariants } from './base/badge';
export { Button, buttonVariants } from './base/button';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './base/dialog';
export { Input } from './base/input';
export { Label } from './base/label';
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './base/pagination';
export { Skeleton } from './base/skeleton';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './base/table';

// Propios: sin primitivo equivalente en shadcn/ui ni en MynaUI (ver ADR-0013).
export {
  DataTable,
  type DataTableColumn,
  type DataTableProps,
} from './DataTable';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { Field, type FieldProps } from './Field';
export { SearchInput, type SearchInputProps } from './SearchInput';
export {
  Tabs,
  type TabsListProps,
  type TabsPanelProps,
  type TabsProps,
  type TabsTriggerProps,
} from './Tabs';
