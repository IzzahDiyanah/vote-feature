'use client';

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { inputClass } from './ui';

interface Common {
  label: string;
  error?: string;
  hint?: string;
}

/** Input with a label, plus hint/error text linked via aria-describedby */
export function TextField({ label, error, hint, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        {...props}
      />
      <Note id={noteId} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ label, error, hint, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        className={`${inputClass} resize-y`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? noteId : undefined}
        {...props}
      />
      <Note id={noteId} error={error} hint={hint} />
    </div>
  );
}

function Note({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null;
  return (
    <p id={id} className={`mt-1 text-sm ${error ? 'text-rose-800' : 'text-muted'}`}>
      {error ?? hint}
    </p>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <select id={id} className={inputClass} {...props}>
        {children}
      </select>
    </div>
  );
}
