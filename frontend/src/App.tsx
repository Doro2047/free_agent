import { AppRouter } from './router';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import { Toaster } from 'sonner';
import './index.css';

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppRouter />
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
