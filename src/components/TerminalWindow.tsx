import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";

type TerminalWindowProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const TerminalWindow = ({ title, subtitle, children }: TerminalWindowProps) => {
  return (
    <Box className="terminal-window">
      <Box className="terminal-header">
        <span className="terminal-close" aria-hidden="true" />
        <Stack spacing={0}>
          <Typography variant="caption" sx={{ letterSpacing: "0.06em" }}>
            steef@steefware:~ / {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      </Box>
      <Box className="terminal-body">{children}</Box>
    </Box>
  );
};
