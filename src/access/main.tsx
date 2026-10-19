import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessApp } from './AccessApp';
import '../styles/global.css';

/**
 * The public access page (and the public Terms). Built separately from the
 * planner, so it never includes the meal library or the planner itself.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessApp />
  </StrictMode>,
);
