import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal accesible: atrapa el foco dentro del diálogo, `Esc` cierra, y al
 * cerrar el foco vuelve al elemento que lo abrió. Se usa para altas y
 * cancelaciones (ADR-0006).
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement;
    const dialogNode = dialogRef.current;
    const firstFocusable =
      dialogNode?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? dialogNode)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogNode) return;

      const focusable = Array.from(
        dialogNode.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
          className,
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
