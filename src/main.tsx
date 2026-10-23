import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Gallery from './Gallery';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode>{window.location.pathname.replace(/\/$/, '') === '/gallery' ? <Gallery /> : <App />}</React.StrictMode>);
