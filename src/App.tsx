import { IconButton, Link, Stack, Typography, Tooltip } from "@mui/material";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { SceneCanvas } from "./components/SceneCanvas";
import { TerminalWindow } from "./components/TerminalWindow";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Apps } from "./pages/Apps";
import { useContext, useEffect, useMemo, useState } from "react";
import { ColorModeContext } from "./colorMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

const useRouteTitle = () => {
  const location = useLocation();
  return useMemo(() => {
    switch (location.pathname) {
      case "/about":
        return "about.md";
      case "/apps":
        return "apps.md";
      default:
        return "steefware.md";
    }
  }, [location.pathname]);
};

const NavItem = ({ to, label, end }: { to: string; label: string; end?: boolean }) => (
  <Link
    component={NavLink}
    to={to}
    end={end}
    sx={(theme) => ({
      textDecoration: "none",
      color: "text.secondary",
      "&.active": {
        color: theme.palette.primary.main,
        fontWeight: 600,
      },
    })}
  >
    {label}
  </Link>
);

const App = () => {
  const [backgroundFocus, setBackgroundFocus] = useState(false);
  const routeTitle = useRouteTitle();
  const { mode, toggleColorMode } = useContext(ColorModeContext);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        setBackgroundFocus((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-shell">
      <SceneCanvas focus={backgroundFocus} mode={mode} />
      {backgroundFocus ? (
        <div className="kbd-hint">WASD / Arrows</div>
      ) : null}
      <div className={`overlay ${backgroundFocus ? "is-background" : ""}`}>
        <TerminalWindow title={routeTitle} subtitle="nonvibecoded tools">
          <Stack spacing={3}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                nav:
              </Typography>
              <NavItem to="/" label="home" end />
              <NavItem to="/about" label="about" />
              <NavItem to="/apps" label="apps" />
              <Tooltip title="Toggle theme">
                <IconButton size="small" onClick={toggleColorMode}>
                  {mode === "light" ? (
                    <DarkModeIcon fontSize="inherit" />
                  ) : (
                    <LightModeIcon fontSize="inherit" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/apps" element={<Apps />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Stack>
        </TerminalWindow>
      </div>
    </div>
  );
};

export default App;
