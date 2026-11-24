import type { ReactNode } from 'react';

// shared classes for inputs and buttons
export const inputClass =
  'w-full rounded-md border border-rule bg-surface px-3 py-2 text-base text-ink placeholder:text-muted hover:border-ink/40 aria-[invalid=true]:border-rose-700';
export const primaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50';
export const secondaryButton =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-rule bg-surface px-4 py-2 text-sm font-semibold text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50';
export const textLink = 'font-medium underline decoration-rule underline-offset-4 hover:decoration-ink';

/** Error or info message */
export function Alert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'info' }) {
  const colours = tone === 'error' ? 'border-rose-700 bg-rose-50 text-rose-900' : 'border-ink bg-surface text-ink';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`border-l-4 px-3 py-2 text-sm ${colours}`}>
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="border-y border-rule py-10 text-center">
      <p className="font-display text-lg font-semibold">Something went wrong</p>
      <p className="mx-auto mt-1 max-w-sm text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${secondaryButton} mt-4`}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-y border-rule py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-sm text-muted">{children}</div>}
    </div>
  );
}

/** Placeholder rows while loading */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="motion-safe:animate-pulse">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-rule py-5">
          <div className="h-16 rounded-md bg-rule/60" />
          <div className="space-y-2">
            <div className="h-5 w-2/3 rounded bg-rule/60" />
            <div className="h-4 w-full rounded bg-rule/40" />
            <div className="h-4 w-1/3 rounded bg-rule/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
