import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';

import { useApproveQuote, useRejectQuote } from '../hooks';
import { quoteStatusLabel, type QuoteSummary } from '../types';

export interface QuoteDetailDialogProps {
  readonly quote: QuoteSummary | null;
  readonly onOpenChange: (open: boolean) => void;
}

const amountFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function QuoteDetailDialog({
  quote,
  onOpenChange,
}: QuoteDetailDialogProps) {
  const approveQuote = useApproveQuote();
  const rejectQuote = useRejectQuote();

  function close() {
    approveQuote.reset();
    rejectQuote.reset();
    onOpenChange(false);
  }

  const isPending = quote?.status === 'pending_approval';
  const isSaving = approveQuote.isPending || rejectQuote.isPending;

  return (
    <Dialog
      open={quote !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle de cotización</DialogTitle>
          <DialogDescription>
            {quote
              ? `Solicitud de ${quote.request.customer.name}: ${quote.request.piece} · x${quote.request.quantity}`
              : null}
          </DialogDescription>
        </DialogHeader>
        {quote && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-medium">
                {amountFormatter.format(Number(quote.amount))}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant="secondary">
                {quoteStatusLabel(quote.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cotizada</span>
              <span>
                {format(new Date(quote.createdAt), 'd MMM yyyy', {
                  locale: es,
                })}
              </span>
            </div>
            {(approveQuote.isError || rejectQuote.isError) && (
              <p className="text-sm text-destructive">
                {approveQuote.error?.message ?? rejectQuote.error?.message}
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          {isPending && quote ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() =>
                  rejectQuote.mutate(quote.id, { onSuccess: close })
                }
              >
                {rejectQuote.isPending ? 'Rechazando...' : 'Rechazar'}
              </Button>
              <Button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  approveQuote.mutate(quote.id, { onSuccess: close })
                }
              >
                {approveQuote.isPending ? 'Aprobando...' : 'Aprobar'}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={close}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
