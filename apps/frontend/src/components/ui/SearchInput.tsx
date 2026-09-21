import React, { useState, useEffect, type ChangeEvent } from 'react';

type HTMLInputPropsClean = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
>;

export interface SearchInputProps extends HTMLInputPropsClean {
  onSearch: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  onSearch,
  debounceMs = 300,
  placeholder = 'Buscar cliente, OT o pieza',
  className = '',
  initialValue = '',
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(initialValue);
  const [prevInitialValue, setPrevInitialValue] = useState<string>(initialValue);

  // Sincronización patrón React: se ejecuta durante el render sin causar renders en cascada en un useEffect
  if (initialValue !== prevInitialValue) {
    setPrevInitialValue(initialValue);
    setSearchTerm(initialValue);
  }

  // Aplica debounce antes de invocar el callback onSearch
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs, onSearch]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`relative inline-flex items-center w-full max-w-xs ${className}`}>
      {/* Ícono de Lupa (SVG Accesible) */}
      <div className="absolute left-3.5 pointer-events-none text-slate-400 flex items-center justify-center">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="search"
        role="searchbox"
        aria-label="Buscar cliente, OT o pieza"
        value={searchTerm}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-1.5 text-sm leading-5 rounded-full border border-slate-300 bg-white text-[var(--color-neutral-dark)] placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all duration-150"
        {...props}
      />
    </div>
  );
};