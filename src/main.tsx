// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

// React Router
import { BrowserRouter } from 'react-router-dom';

// Redux
import { Provider } from 'react-redux';
import { store } from './stores/store';

// MUI Theme
import { CssBaseline } from '@mui/material';
import { ThemeProviderCustom } from './theme/ThemeProviderCustom';

// Mantine
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import 'dayjs/locale/vi';

// App root
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <MantineProvider defaultColorScheme="light">
        <DatesProvider settings={{ locale: 'vi', firstDayOfWeek: 1 }}>
          <BrowserRouter>
            <ThemeProviderCustom>
              <CssBaseline />
              <App />
            </ThemeProviderCustom>
          </BrowserRouter>
        </DatesProvider>
      </MantineProvider>
    </Provider>
  </React.StrictMode>
);
