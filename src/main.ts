import './style.css';
import { mountApp } from './ui/app';

mountApp(document);

// Lets the installed app receive shared screenshots (ADR 0010). Built only for production.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js', { type: 'module' });
}
