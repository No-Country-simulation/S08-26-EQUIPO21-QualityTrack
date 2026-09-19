import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

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
 * después de la última tecla, no en cada `onChange`.
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
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="m17 17-4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        role="searchbox"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 py-2 pr-3 pl-9 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        {...props}
      />
    </div>
  );
}
