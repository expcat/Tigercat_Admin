import { useState, useCallback } from 'react';
import { AuthForm, AuthErrors, validate } from './validation';
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

  const validateForm = useCallback((): boolean => {
    const newErrors = validate(form);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const resetForm = useCallback(() => {
    setForm(initialState);
    setErrors({});
  }, [initialState]);

  return {
    form,
    errors,
    setErrors,
    setField,
    validateForm,
    resetForm,
    setForm,
  };
};
