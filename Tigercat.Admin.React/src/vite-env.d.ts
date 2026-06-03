/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TIGERCAT_DEMO?: string;
  readonly VITE_TIGERCAT_ROUTER_MODE?: 'hash' | 'history';
  readonly VITE_TIGERCAT_BASE_PATH?: string;
  readonly VITE_TIGERCAT_ROUTER_BASE?: string;
  readonly VITE_TIGERCAT_OUT_DIR?: string;
}
