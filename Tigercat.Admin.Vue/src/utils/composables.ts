import { ref } from 'vue';
import { type AuthForm, type AuthErrors } from './validation';

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

  return { form, errors, setField };
}
