import { ErrorBoundary } from './components/common/ErrorBoundary';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import { Toaster } from 'sonner';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <AppRouter />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

export default App;
