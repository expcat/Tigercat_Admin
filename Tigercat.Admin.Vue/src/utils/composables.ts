import { ref, type Ref } from 'vue';
import { type AuthForm, type AuthErrors, validate } from './validation';

export function useAuthForm(initialState: AuthForm) {
  // Use a copy to avoid mutation of the passed initial state object
  const form = ref<AuthForm>({ ...initialState });
  const errors = ref<AuthErrors>({});

  const setField = (field: keyof AuthForm, value: any) => {
    form.value[field] = value;
    if (errors.value[field]) {
      errors.value[field] = undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors = validate(form.value);
    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    form.value = { ...initialState };
    errors.value = {};
  };

  return { form, errors, setField, validateForm, resetForm };
}
