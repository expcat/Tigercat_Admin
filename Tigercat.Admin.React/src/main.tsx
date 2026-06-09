import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ConfigProvider, MessageContainer } from '@expcat/tigercat-react';
import { appText } from './utils/tigercatText';
import {
  installTigercatMockApi,
  isTigercatDemoEnabled,
} from '@tigercat-admin/mock-api';
import { PermissionProvider } from './utils/permission';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const demoEnabled = isTigercatDemoEnabled(import.meta.env.VITE_TIGERCAT_DEMO);
const routerMode = import.meta.env.VITE_TIGERCAT_ROUTER_MODE;
const basePath = import.meta.env.VITE_TIGERCAT_BASE_PATH || '/';
const routerBase = import.meta.env.VITE_TIGERCAT_ROUTER_BASE ?? basePath;

installTigercatMockApi({ enabled: demoEnabled });

const app = (
  <ConfigProvider locale={appText}>
    <PermissionProvider>
      <App />
      <MessageContainer />
    </PermissionProvider>
  </ConfigProvider>
);

createRoot(rootElement).render(
  <StrictMode>
    {routerMode === 'hash' ? (
      <HashRouter basename={routerBase || undefined}>{app}</HashRouter>
    ) : (
      <BrowserRouter basename={routerBase === '/' ? undefined : routerBase}>
        {app}
      </BrowserRouter>
    )}
  </StrictMode>,
);
