import { Search } from '@mynaui/icons-react';
import { cn } from 'cn';
import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

import { Input } from './base/input';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'type' | 'defaultValue'
> {
  defaultValue?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}

/**
 * Input de búsqueda con debounce: `onSearch` se dispara `debounceMs`
 * después de la última tecla, no en cada `onChange`. Ningún primitivo de
 * shadcn/ui o MynaUI resuelve esto genérico, así que sigue siendo propio
 * -- construido sobre el `Input` de shadcn/ui.
 */
export function SearchInput({
  defaultValue = '',
  onSearch,
  debounceMs = 300,
  placeholder = 'Buscar…',
  className,
  ...props
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => onSearchRef.current(value), debounceMs);
    return () => clearTimeout(timeoutId);
  }, [value, debounceMs]);

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
        {...props}
      />
    </div>
  );
}
