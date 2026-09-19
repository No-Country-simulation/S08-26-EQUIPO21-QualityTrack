import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        // Paleta corregida de QualityTrack (ver docs/adr/0013-mynaui-kit-ui.md,
        // anexo "paleta corregida"): Tailwind estándar, no los hex del
        // mockup -- esos eran tokens placeholder sin reemplazar por la marca.
        destructive:
          'border-rose-200 bg-rose-50 text-rose-700 *:data-[slot=alert-description]:text-rose-700/90',
        info: 'border-blue-200 bg-blue-50 text-blue-700 *:data-[slot=alert-description]:text-blue-700/90',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700 *:data-[slot=alert-description]:text-emerald-700/90',
        // amber-800, no amber-700: sobre bg-amber-100 (más oscuro que el
        // amber-50 de los otros tres) hace falta ese salto extra para
        // mantener el mismo contraste de texto ~4.5:1.
        warning:
          'border-amber-200 bg-amber-100 text-amber-800 *:data-[slot=alert-description]:text-amber-800/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-action"
      className={cn('absolute top-2 right-2', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
