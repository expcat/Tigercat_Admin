import type { Directive, DirectiveBinding } from 'vue';
import { hasPermission, hasAnyPermission } from '../utils/permission';

/**
 * v-permission directive — controls element visibility based on permission codes.
 *
 * Usage:
 *   v-permission="'user:create'"            — single code (must have)
 *   v-permission="['user:view','role:view']" — must have ALL listed codes
 *
 * Modifiers:
 *   v-permission.any="['user:edit','role:edit']" — must have ANY of the listed codes
 *
 * When the check fails the element is removed from the DOM.
 */

function check(el: HTMLElement, binding: DirectiveBinding): void {
  const value = binding.value;
  if (!value) return;

  const codes: string[] = Array.isArray(value) ? value : [value];
  const useAny = binding.modifiers?.any === true;

  const permitted = useAny ? hasAnyPermission(...codes) : hasPermission(...codes);

  if (!permitted) {
    // Store a comment placeholder so we can track the position
    const comment = document.createComment('v-permission');
    (el as any).__v_permission_anchor__ = comment;
    el.parentNode?.replaceChild(comment, el);
  }
}

function tryRestore(el: HTMLElement): void {
  const anchor = (el as any).__v_permission_anchor__ as Comment | undefined;
  if (anchor?.parentNode) {
    anchor.parentNode.replaceChild(el, anchor);
    delete (el as any).__v_permission_anchor__;
  }
}

export const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    check(el, binding);
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    // Restore element first in case permissions changed and it should now be visible
    tryRestore(el);
    check(el, binding);
  },
};
