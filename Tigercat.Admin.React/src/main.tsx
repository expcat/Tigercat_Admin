import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from '@expcat/tigercat-react';
import { PermissionProvider } from './utils/permission';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <PermissionProvider>
          <App />
        </PermissionProvider>
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);

