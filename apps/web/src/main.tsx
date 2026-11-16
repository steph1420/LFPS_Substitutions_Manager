// Tokens first: they fix the cascade layer order for every stylesheet after them (Bundle 47a).
import './tokens/tokens.css';
import './tokens/properties.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

