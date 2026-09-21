import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

import {
  Tabs as BaseTabs,
  TabsContent,
  TabsList as BaseTabsList,
  TabsTrigger as BaseTabsTrigger,
} from './base/tabs';

export interface TabsProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly children: ReactNode;
  readonly className?: string;
}

function TabsRoot({ value, onValueChange, children, className }: TabsProps) {
  return (
    <BaseTabs value={value} onValueChange={onValueChange} className={className}>
      {children}
    </BaseTabs>
  );
}

export type TabsListProps = ComponentProps<typeof BaseTabsList>;

function TabsList({ className, ...props }: Omit<TabsListProps, 'variant'>) {
  return (
    <BaseTabsList
      variant="line"
      className={cn('gap-1 border-b border-border p-0', className)}
      {...props}
    />
  );
}

export interface TabsTriggerProps {
  readonly value: string;
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly className?: string;
}

function TabsTrigger({
  value,
  children,
  disabled,
  className,
}: TabsTriggerProps) {
  return (
    <BaseTabsTrigger
      value={value}
      disabled={disabled}
      className={cn(
        'rounded-none px-3 py-2 text-muted-foreground data-active:text-primary after:bg-primary',
        className,
      )}
    >
      {children}
    </BaseTabsTrigger>
  );
}

export interface TabsPanelProps {
  readonly value: string;
  readonly children: ReactNode;
  readonly className?: string;
}

function TabsPanel({ value, children, className }: TabsPanelProps) {
  return (
    <TabsContent value={value} className={className}>
      {children}
    </TabsContent>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
