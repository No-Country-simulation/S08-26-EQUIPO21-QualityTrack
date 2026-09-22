import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
} from '@/components/ui';
import { ClientCombobox } from '@/features/clients/components/ClientCombobox';

import { useCreateRequest } from '../hooks';
import {
  newRequestSchema,
  type NewRequestFormInput,
  type NewRequestFormValues,
} from '../schemas';

export interface NewRequestDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function NewRequestDialog({
  open,
  onOpenChange,
}: NewRequestDialogProps) {
  const createRequest = useCreateRequest();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewRequestFormInput, unknown, NewRequestFormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: { customerId: '', piece: '' },
  });

  function close() {
    reset();
    createRequest.reset();
    onOpenChange(false);
  }

  const onSubmit = handleSubmit((values) => {
    createRequest.mutate(
      {
        customerId: values.customerId,
        piece: values.piece,
        quantity: values.quantity,
      },
      { onSuccess: close },
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            Registrar el pedido de un cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>
              Cliente <span className="text-destructive"> *</span>
            </Label>
            <Controller
              control={control}
              name="customerId"
              render={({ field }) => (
                <ClientCombobox
                  value={field.value || null}
                  onChange={field.onChange}
                  error={errors.customerId?.message}
                />
              )}
            />
            {errors.customerId && (
              <p className="text-xs text-destructive">
                {errors.customerId.message}
              </p>
            )}
          </div>

          <Field label="Pieza" required error={errors.piece?.message}>
            <Input {...register('piece')} placeholder="Brida DN200" />
          </Field>

          <Field label="Cantidad" required error={errors.quantity?.message}>
            <Input
              type="number"
              min="1"
              step="1"
              {...register('quantity')}
              placeholder="12"
            />
          </Field>

          {createRequest.isError && (
            <p className="text-sm text-destructive">
              {createRequest.error.message}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Creando...' : 'Crear solicitud'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
