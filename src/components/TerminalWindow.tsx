import { Typography } from "@mui/material";
import type { ReactNode } from "react";

type TerminalWindowProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const TerminalWindow = ({ title, subtitle, children }: TerminalWindowProps) => {
  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <span className="terminal-close" aria-hidden="true" />
        <div className="terminal-title">
          <Typography variant="caption" sx={{ letterSpacing: "0.06em" }}>
            steef@steefware:~ / {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {subtitle}
            </Typography>
          ) : null}
        </div>
      </div>
      <div className="terminal-body">{children}</div>
    </div>
  );
};
