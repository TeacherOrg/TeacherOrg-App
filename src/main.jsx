import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';
import { BrowserRouter } from 'react-router-dom';  // Neu: Import des BrowserRouters

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>  // Neu: Wrap um die App
    <App />
  </BrowserRouter>
);