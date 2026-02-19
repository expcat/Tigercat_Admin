import type { Directive, DirectiveBinding } from 'vue';
import { watchEffect, type WatchStopHandle } from 'vue';
import { hasPermission, hasAnyPermission, permissionCodes } from '../utils/permission';

/**
 * v-permission directive — controls element visibility based on permission codes.
 *
 * Uses `display: none` to hide elements, keeping them in the DOM so Vue's
 * lifecycle stays consistent and no orphaned nodes are left on unmount.
 *
 * Reactively watches `permissionCodes` so that visibility updates automatically
 * when permissions are loaded asynchronously (e.g. after page refresh).
 *
 * Usage:
 *   v-permission="'user:create'"            — single code (must have)
 *   v-permission="['user:view','role:view']" — must have ALL listed codes
 *
 * Modifiers:
 *   v-permission.any="['user:edit','role:edit']" — must have ANY of the listed codes
 */

const ORIGINAL_DISPLAY = Symbol('v-permission-display');
const STOP_WATCHER = Symbol('v-permission-stop');

function applyPermission(el: HTMLElement, binding: DirectiveBinding): void {
  const value = binding.value;
  if (!value) return;

  const codes: string[] = Array.isArray(value) ? value : [value];
  const useAny = binding.modifiers?.any === true;

  // Access permissionCodes.value so watchEffect tracks it as a dependency.
  const permitted = useAny ? hasAnyPermission(...codes) : hasPermission(...codes);

  if (!permitted) {
    if (!(ORIGINAL_DISPLAY in (el as any))) {
      (el as any)[ORIGINAL_DISPLAY] = el.style.display;
    }
    el.style.display = 'none';
  } else {
    if (ORIGINAL_DISPLAY in (el as any)) {
      el.style.display = (el as any)[ORIGINAL_DISPLAY] ?? '';
      delete (el as any)[ORIGINAL_DISPLAY];
    }
  }
}

function setupWatcher(el: HTMLElement, binding: DirectiveBinding): void {
  // Clean up any existing watcher first.
  teardownWatcher(el);

  const stop = watchEffect(() => {
    // This creates a reactive dependency on permissionCodes.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    permissionCodes.value;
    applyPermission(el, binding);
  });

  (el as any)[STOP_WATCHER] = stop;
}

function teardownWatcher(el: HTMLElement): void {
  const stop = (el as any)[STOP_WATCHER] as WatchStopHandle | undefined;
  if (stop) {
    stop();
    delete (el as any)[STOP_WATCHER];
  }
}

export const vPermission: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    setupWatcher(el, binding);
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    // Re-create watcher when binding value changes (e.g. dynamic permission codes).
    setupWatcher(el, binding);
  },
  unmounted(el: HTMLElement) {
    teardownWatcher(el);
    if (ORIGINAL_DISPLAY in (el as any)) {
      delete (el as any)[ORIGINAL_DISPLAY];
    }
  },
};
