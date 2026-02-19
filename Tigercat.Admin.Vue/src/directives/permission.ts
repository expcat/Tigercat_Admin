import type { Directive, DirectiveBinding } from 'vue';
import { hasPermission, hasAnyPermission } from '../utils/permission';

/**
 * v-permission directive — controls element visibility based on permission codes.
 *
 * Uses `display: none` to hide elements, keeping them in the DOM so Vue's
 * lifecycle stays consistent and no orphaned nodes are left on unmount.
 *
 * Usage:
 *   v-permission="'user:create'"            — single code (must have)
 *   v-permission="['user:view','role:view']" — must have ALL listed codes
 *
 * Modifiers:
 *   v-permission.any="['user:edit','role:edit']" — must have ANY of the listed codes
 */

const ORIGINAL_DISPLAY = Symbol('v-permission-display');

function applyPermission(el: HTMLElement, binding: DirectiveBinding): void {
  const value = binding.value;
  if (!value) return;

  const codes: string[] = Array.isArray(value) ? value : [value];
  const useAny = binding.modifiers?.any === true;
  const permitted = useAny ? hasAnyPermission(...codes) : hasPermission(...codes);

  if (!permitted) {
    // Preserve the original display value so we can restore it later.
    if (!(ORIGINAL_DISPLAY in (el as any))) {
      (el as any)[ORIGINAL_DISPLAY] = el.style.display;
    }
    el.style.display = 'none';
  } else {
    // Restore original display value if it was previously hidden.
    if (ORIGINAL_DISPLAY in (el as any)) {
      el.style.display = (el as any)[ORIGINAL_DISPLAY] ?? '';
      delete (el as any)[ORIGINAL_DISPLAY];
    }
  }
}

export const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    applyPermission(el, binding);
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    applyPermission(el, binding);
  },
  unmounted(el: HTMLElement) {
    // Clean up stored display value.
    if (ORIGINAL_DISPLAY in (el as any)) {
      delete (el as any)[ORIGINAL_DISPLAY];
    }
  },
};
