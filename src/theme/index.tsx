// src/theme/index.ts
import { createTheme } from '@mui/material/styles';
import '@fortune-sheet/react/dist/index.css';

// ✅ OFFLINE FONT (Inter) - self-host via npm package
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';

declare module '@mui/material/styles' {
  interface Theme {
    customGradients: {
      appBackground: string;
      headerBackground: string;
      loginBackground: string;
      loginButton: string;
    };
  }
  interface ThemeOptions {
    customGradients?: {
      appBackground?: string;
      headerBackground?: string;
      loginBackground?: string;
      loginButton?: string;
    };
  }
}

// 👉 Typography chung: chữ to, dễ đọc cho cả 3 theme
const baseTypography = {
  // ✅ đồng bộ font toàn hệ thống (tránh fallback gây “lỗi font”)
  fontFamily: `'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif`,
  fontSize: 15,

  body1: {
    fontSize: '1rem',
    lineHeight: 1.65,
  },
  body2: {
    fontSize: '0.95rem',
    lineHeight: 1.55,
  },
  h6: {
    fontSize: '1.1rem',
    fontWeight: 700, // ✅ tránh 900 để không fake bold
  },
  h5: {
    fontSize: '1.4rem',
    fontWeight: 800, // ✅ header/title nhìn “đã” hơn, vẫn an toàn
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  button: {
    fontSize: '0.95rem',
    textTransform: 'none' as const,
    fontWeight: 700,
  },
};

/* =========================================================
 * THEME 1 – NAVY CALM
 * =======================================================*/
export const navyTheme = createTheme({
  zIndex: {
    appBar: 1200,
    drawer: 1100,
    modal: 2000,
    snackbar: 2100,
    tooltip: 2200,
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2A3F5F',    // navy trung tính
      light: '#3E567A',
      dark: '#1B2A3D',
      contrastText: '#F3F6FA',
    },
    secondary: {
      main: '#FFB347',    // accent ấm
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1D1F23',    // chữ đậm, rõ
      secondary: '#6A7483',  // chữ phụ
    },
    divider: '#D5D9E2',
  },

  typography: baseTypography,

  customGradients: {
    appBackground:
      'linear-gradient(135deg, #F5F7FA 0%, #E6ECF8 40%, #F5F7FA 100%)',
    headerBackground:
      'linear-gradient(135deg, #1B2A3D 0%, #2A3F5F 55%, #3E567A 100%)',
    loginBackground:
      'linear-gradient(135deg, #1B2A3D 0%, #2A3F5F 45%, #3E567A 100%)',
    loginButton:
      'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(245,247,250,0.9))',
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F5F7FA',
          color: '#1D1F23',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: '18px',
          paddingBlock: '8px',
          backgroundColor: '#2A3F5F',
          '&:hover': {
            backgroundColor: '#3E567A',
          },
          '&:active': {
            backgroundColor: '#1B2A3D',
          },
        },
        outlinedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
        },
      },
    },
  },
});

/* =========================================================
 * THEME 2 – BLUE-GRAY SOFT
 * =======================================================*/
export const blueGrayTheme = createTheme({
  zIndex: {
    appBar: 1200,
    drawer: 1100,
    modal: 2000,
    snackbar: 2100,
    tooltip: 2200,
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#4A637D',
      light: '#6C8096',
      dark: '#34475A',
      contrastText: '#F5F7FA',
    },
    secondary: {
      main: '#7FB4FF', // xanh nhạt làm accent
    },
    background: {
      default: '#F7F9FB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1C1E',
      secondary: '#606B78',
    },
    divider: '#D8DFE8',
  },

  typography: baseTypography,

  customGradients: {
    appBackground:
      'linear-gradient(160deg, #F7F9FB 0%, #EDF1F7 40%, #F7F9FB 100%)',
    headerBackground:
      'linear-gradient(160deg, #34475A 0%, #4A637D 55%, #6C8096 100%)',
    loginBackground:
      'linear-gradient(160deg, #34475A 0%, #4A637D 45%, #6C8096 100%)',
    loginButton:
      'linear-gradient(145deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92))',
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F7F9FB',
          color: '#1A1C1E',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: '18px',
          paddingBlock: '8px',
          backgroundColor: '#4A637D',
          '&:hover': {
            backgroundColor: '#6C8096',
          },
          '&:active': {
            backgroundColor: '#34475A',
          },
        },
        outlinedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
        },
      },
    },
  },
});

/* =========================================================
 * THEME 3 – FOREST SLATE (green-ish dịu mắt)
 * =======================================================*/
export const forestSlateTheme = createTheme({
  zIndex: {
    appBar: 1200,
    drawer: 1100,
    modal: 2000,
    snackbar: 2100,
    tooltip: 2200,
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2E4F4F',
      light: '#3F6464',
      dark: '#1F3636',
      contrastText: '#ECF2F2',
    },
    secondary: {
      main: '#F2B279', // cam đất nhẹ
    },
    background: {
      default: '#F4F6F5',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2421',
      secondary: '#5D6763',
    },
    divider: '#D2D8D5',
  },

  typography: baseTypography,

  customGradients: {
    appBackground:
      'linear-gradient(145deg, #F4F6F5 0%, #E8EEEB 40%, #F4F6F5 100%)',
    headerBackground:
      'linear-gradient(145deg, #1F3636 0%, #2E4F4F 55%, #3F6464 100%)',
    loginBackground:
      'linear-gradient(145deg, #1F3636 0%, #2E4F4F 45%, #3F6464 100%)',
    loginButton:
      'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(238,244,241,0.9))',
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F4F6F5',
          color: '#1F2421',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          paddingInline: '18px',
          paddingBlock: '8px',
          backgroundColor: '#2E4F4F',
          '&:hover': {
            backgroundColor: '#3F6464',
          },
          '&:active': {
            backgroundColor: '#1F3636',
          },
        },
        outlinedPrimary: {
          textTransform: 'none',
          fontWeight: 600,
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
        },
      },
    },
  },
});
