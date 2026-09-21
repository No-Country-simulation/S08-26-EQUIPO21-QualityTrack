import React from 'react';

export type QuoteStatus = 'pending_approval' | 'approved' | 'rejected';

export type WorkOrderStatus =
  | 'created'
  | 'routed'
  | 'in_production'
  | 'in_quality_control'
  | 'nonconforming'
  | 'delivered'
  | 'cancelled';

export type BadgeStatus = QuoteStatus | WorkOrderStatus;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

const statusStyles: Record<BadgeStatus, string> = {
  // QUOTE Statuses
  pending_approval: 'bg-[var(--color-neutral-dark)] text-white border-slate-700',
  approved: 'bg-[var(--color-success)] text-white border-emerald-700',
  rejected: 'bg-[var(--color-destructive)] text-white border-rose-700',

  // WORK_ORDER Statuses
  created: 'bg-sky-100 text-sky-900 border-sky-300',
  routed: 'bg-slate-200 text-[var(--color-neutral-dark)] border-slate-300',
  in_production: 'bg-[var(--color-primary)] text-white border-blue-700',
  in_quality_control: 'bg-[var(--color-warning)] text-slate-950 border-amber-600',
  nonconforming: 'bg-[var(--color-destructive)] text-white border-rose-700',
  delivered: 'bg-[var(--color-success)] text-white border-emerald-700',
  cancelled: 'bg-[var(--color-neutral-light)] text-slate-700 border-slate-300',
};

const defaultLabels: Record<BadgeStatus, string> = {
  pending_approval: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  created: 'Cotizada',
  routed: 'En Ruta',
  in_production: 'En Producción',
  in_quality_control: 'En Calidad',
  nonconforming: 'No Conforme',
  delivered: 'Conforme',
  cancelled: 'Cerrada',
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  className = '',
  ...props
}) => {
  const displayText = label || defaultLabels[status];

  return (
    <span
      role="status"
      aria-label={`Estado: ${displayText}`}
      className={`inline-flex items-center justify-center px-3 py-1 rounded-md text-base leading-6 font-medium border transition-colors ${statusStyles[status]} ${className}`}
      {...props}
    >
      {displayText}
    </span>
  );
};