'use client';

import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/api';
import { TextArea, TextField } from './fields';
import { Alert, primaryButton, secondaryButton } from './ui';

const TITLE = { min: 5, max: 120 };
const DESCRIPTION = { min: 10, max: 2000 };

interface Values {
  title: string;
  description: string;
}

/** Form for creating and editing a request. Validated here and on the server. */
export function RequestForm({
  initial = { title: '', description: '' },
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Values;
  submitLabel: string;
  onSubmit: (values: Values) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const title = values.title.trim();
  const description = values.description.trim();
  const errors = {
    title:
      title.length < TITLE.min
        ? `Use at least ${TITLE.min} characters so others can tell what this is.`
        : undefined,
    description:
      description.length < DESCRIPTION.min
        ? `Add at least ${DESCRIPTION.min} characters. What problem would this solve?`
        : undefined,
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (errors.title || errors.description) return;
    setPending(true);
    setServerError(null);
    try {
      await onSubmit({ title, description });
    } catch (error) {
      setServerError(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {serverError && <Alert>{serverError}</Alert>}
      <TextField
        label="Title"
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        maxLength={TITLE.max}
        error={tried ? errors.title : undefined}
        hint={`${values.title.length} of ${TITLE.max} characters`}
        placeholder="Dark mode for the dashboard"
        required
      />
      <TextArea
        label="Description"
        rows={6}
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        maxLength={DESCRIPTION.max}
        error={tried ? errors.description : undefined}
        hint={`${values.description.length} of ${DESCRIPTION.max} characters`}
        required
      />
      <div className="flex gap-3">
        <button type="submit" className={primaryButton} disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={secondaryButton} onClick={onCancel} disabled={pending}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
