import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StatsApp } from './StatsApp';
import '../styles/global.css';

/** Holly's usage dashboard at /stats: reads /api/stats with the STATS_KEY. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StatsApp />
  </StrictMode>,
);
