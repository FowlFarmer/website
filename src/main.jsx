import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import App from './App.jsx';
import './App.css';

// One address per page, before anything reads it: /quests/ and /Quests become /quests. The router
// matches either, but the scene and the menu bar compare the path exactly, so on /quests/ the
// quests page showed over the Lawson scene instead of the kitsune.
{
  const tidy = window.location.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  if (tidy !== window.location.pathname) {
    window.history.replaceState(window.history.state, '', tidy + window.location.search + window.location.hash);
  }
}

// Entry point for the React application.  This file mounts the
// App component into the DOM.  We use React 18's createRoot API
// for improved concurrency support.
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}