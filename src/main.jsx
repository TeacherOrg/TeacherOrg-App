import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { BrowserRouter } from 'react-router-dom';  // Importiere BrowserRouter hier

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>  // Wrap um App – das behebt den Kontext-Fehler
    <App />
  </BrowserRouter>
);