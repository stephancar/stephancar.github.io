import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export const getTheme = (mode: PaletteMode) =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: "#7fb7ff",
        light: "#a7d0ff",
        dark: "#4d8bdc",
        contrastText: "#0b1114",
      },
      background: {
        default: mode === "dark" ? "#0b1114" : "#f6f8f7",
        paper: mode === "dark" ? "#0f1519" : "#f6f8f7",
      },
      text: {
        primary: mode === "dark" ? "#eef4f5" : "#0f1416",
        secondary: mode === "dark" ? "#b8c3c8" : "#384247",
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica Neue", system-ui, sans-serif',
      h1: {
        fontWeight: 500,
        letterSpacing: "-0.02em",
      },
      h2: {
        fontWeight: 500,
        letterSpacing: "-0.02em",
      },
      body1: {
        fontSize: "1rem",
        lineHeight: 1.7,
      },
    },
    shape: {
      borderRadius: 12,
    },
  });
