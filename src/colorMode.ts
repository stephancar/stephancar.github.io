import { createContext } from "react";
import type { PaletteMode } from "@mui/material";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleColorMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "light",
  toggleColorMode: () => {},
});
