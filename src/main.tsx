import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { AppServicesProvider } from './app/AppServicesProvider';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppServicesProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </AppServicesProvider>
  </StrictMode>,
);
