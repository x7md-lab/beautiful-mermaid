import { render } from 'preact';
import { DirectionProvider } from '@base-ui-components/react/direction-provider';
import { App } from './app.jsx';
import { TooltipProvider } from './components/ui/Tooltip.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { registerPreviewFonts } from './lib/fonts.js';
import './styles.css';

addEventListener('unhandledrejection', (e) => console.error('UNHANDLED_REJECTION', e.reason?.stack || e.reason));

registerPreviewFonts();

// DirectionProvider tells Base UI popovers/selects/tooltips to mirror for RTL.
render(
  <DirectionProvider direction="rtl">
    <TooltipProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </TooltipProvider>
  </DirectionProvider>,
  document.getElementById('app')
);
