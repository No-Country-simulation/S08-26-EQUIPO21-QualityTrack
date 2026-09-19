/* eslint-disable react-refresh/only-export-components --
 * Compound component intencional (`Tabs.List` / `Tabs.Trigger` / `Tabs.Panel`
 * vía Object.assign): las piezas internas viven en este único archivo a
 * propósito, no son componentes de página que necesiten su propio límite
 * de Fast Refresh. */
import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/cn';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<Tabs.${component}> debe usarse dentro de <Tabs>.`);
  }
  return context;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

/**
 * La pestaña activa la controla el llamador (`value` / `onValueChange`),
 * nunca un `useState` interno: así una feature puede sincronizarla con la
 * URL (`?tab=`) sin pelear con el componente. Ver docs/frontend-structure.md §3.
 */
function TabsRoot({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  const contextValue = useMemo(
    () => ({ value, onValueChange, baseId }),
    [value, onValueChange, baseId],
  );
  return (
    <TabsContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'>;

function TabsList({ children, className, onKeyDown, ...props }: TabsListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);

    const triggers = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ) ?? [],
    );
    if (triggers.length === 0) return;

    const currentIndex = triggers.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    let nextIndex: number | null;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % triggers.length;
        break;
      case 'ArrowLeft':
        nextIndex =
          currentIndex === -1
            ? 0
            : (currentIndex - 1 + triggers.length) % triggers.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = triggers.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    triggers[nextIndex]?.focus();
    triggers[nextIndex]?.click();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn('flex gap-1 border-b border-gray-200', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

function TabsTrigger({
  value,
  children,
  disabled,
  className,
}: TabsTriggerProps) {
  const {
    value: activeValue,
    onValueChange,
    baseId,
  } = useTabsContext('Trigger');
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        'border-b-2 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50',
        isActive
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700',
        className,
      )}
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsPanel({ value, children, className }: TabsPanelProps) {
  const { value: activeValue, baseId } = useTabsContext('Panel');
  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Panel: TabsPanel,
});
