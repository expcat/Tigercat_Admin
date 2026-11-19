import { useState, useCallback } from 'react';
import { AuthForm, AuthErrors } from './validation';
import { normalizeInput } from './common';

export const useAuthForm = (initialState: AuthForm) => {
  const [form, setForm] = useState<AuthForm>(initialState);
  const [errors, setErrors] = useState<AuthErrors>({});

  const setField = useCallback(
    (field: keyof AuthForm, value: any) => {
      const normalized = normalizeInput(value);
      setForm((prev) => ({ ...prev, [field]: normalized }));

      // Clear error for this specific field if it exists
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [errors],
  );

  return {
    form,
    errors,
    setErrors,
    setField,
    setForm,
  };
};
