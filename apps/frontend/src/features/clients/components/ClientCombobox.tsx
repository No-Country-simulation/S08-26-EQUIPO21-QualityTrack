import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from 'cn';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, Field, Input } from '@/components/ui';
import type { Customer } from '@/types/customer';

import { useCreateCustomer, useCustomers } from '../hooks';
import { newClientSchema, type NewClientFormValues } from '../schemas';

export interface ClientComboboxProps {
  readonly value: string | null;
  readonly onChange: (customerId: string) => void;
  readonly error?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function ClientCombobox({
  value,
  onChange,
  error,
}: ClientComboboxProps) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();

  const selected = useMemo(
    () => customers.find((customer) => customer.id === value) ?? null,
    [customers, value],
  );

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(needle) ||
        customer.taxId.toLowerCase().includes(needle),
    );
  }, [customers, search]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    values: { name: search.trim(), taxId: '', email: '' },
  });

  function pick(customer: Customer) {
    onChange(customer.id);
    setSearch('');
    setCreating(false);
  }

  function clear() {
    onChange('');
    setSearch('');
    setCreating(false);
  }

  const onCreateSubmit = handleSubmit((values) => {
    createCustomer.mutate(values, {
      onSuccess: (customer) => pick(customer),
    });
  });

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success-border bg-success-bg px-3 py-2.5">
        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-success text-xs font-bold text-primary-foreground">
          {initialsOf(selected.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selected.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {selected.email}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Cambiar
        </Button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-sm font-medium">
          Crear «{search.trim() || 'nuevo cliente'}»
        </p>
        <Field
          label="CUIT / identificador tributario"
          error={errors.taxId?.message}
        >
          <Input {...register('taxId')} placeholder="30-71234567-9" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            {...register('email')}
            placeholder="contacto@cliente.com"
          />
        </Field>
        {createCustomer.isError && (
          <p className="text-sm text-destructive">
            {createCustomer.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCreating(false);
              reset();
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={createCustomer.isPending}
            onClick={onCreateSubmit}
          >
            {createCustomer.isPending ? 'Creando...' : 'Crear cliente'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Escribir para buscar o crear…"
        aria-invalid={Boolean(error)}
      />
      <div
        className={cn(
          'absolute top-[calc(100%+4px)] left-0 right-0 z-10 max-h-58 overflow-y-auto rounded-lg border border-border bg-popover shadow-md',
          !search.trim() && 'hidden',
        )}
      >
        {matches.map((customer) => (
          <button
            key={customer.id}
            type="button"
            className="flex w-full items-center gap-3 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-muted"
            onClick={() => pick(customer)}
          >
            <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-muted text-xs font-bold">
              {initialsOf(customer.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {customer.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {customer.email}
              </span>
            </span>
          </button>
        ))}
        {search.trim() && (
          <button
            type="button"
            className="flex w-full items-center gap-3 bg-info-bg px-3 py-2.5 text-left text-info hover:bg-info-bg/70"
            onClick={() => setCreating(true)}
          >
            <span className="flex size-7 flex-none items-center justify-center rounded-lg bg-info text-primary-foreground">
              +
            </span>
            <span className="text-sm font-semibold">
              Crear «{search.trim()}»
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
