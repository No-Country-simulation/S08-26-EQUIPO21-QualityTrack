import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
} from '@/components/ui';

import { useCreateQuote } from '../hooks';
import {
  newQuoteSchema,
  type NewQuoteFormInput,
  type NewQuoteFormValues,
} from '../schemas';
import type { RequestSummary } from '../types';

export interface NewQuoteDialogProps {
  readonly request: RequestSummary | null;
  readonly onOpenChange: (open: boolean) => void;
}

export function NewQuoteDialog({ request, onOpenChange }: NewQuoteDialogProps) {
  const createQuote = useCreateQuote();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewQuoteFormInput, unknown, NewQuoteFormValues>({
    resolver: zodResolver(newQuoteSchema),
  });

  function close() {
    reset();
    createQuote.reset();
    onOpenChange(false);
  }

  const onSubmit = handleSubmit((values) => {
    if (!request) return;

    createQuote.mutate(
      { requestId: request.id, amount: values.amount },
      { onSuccess: close },
    );
  });

  return (
    <Dialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear cotización</DialogTitle>
          <DialogDescription>
            {request
              ? `Solicitud de ${request.customer.name}: ${request.description}`
              : null}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Monto" required error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" {...register('amount')} />
          </Field>
          {createQuote.isError && (
            <p className="text-sm text-destructive">
              {createQuote.error.message}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createQuote.isPending}>
              {createQuote.isPending ? 'Creando...' : 'Crear cotización'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
