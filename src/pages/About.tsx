import { Link as RouterLink } from "react-router-dom";
import { Link, Stack, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";

export const About = () => {
  return (
    <Stack spacing={2}>
      <Helmet>
        <title>About — steefware</title>
        <meta
          name="description"
          content="Nonvibecoded tools: calm, precise, tool-first software."
        />
      </Helmet>

      <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: "2rem" } }}>
        Philosophy
      </Typography>
      <Typography>
        steefware is intentionally nonvibecoded: small utilities with deterministic,
        transparent logic. No bloat, no gimmicks, just tools that behave the same
        every time you open them.
      </Typography>
      <Typography color="text.secondary">
        Each app is crafted to be fast, calm, and predictable. The interface stays
        out of the way, the numbers stay honest, and the results stay readable.
      </Typography>

      <Stack direction="row" spacing={2}>
        <Link component={RouterLink} to="/">
          Back to home
        </Link>
        <Link href="/nonvibecoded/" target="_blank" rel="noreferrer">
          Legacy archive
        </Link>
      </Stack>
    </Stack>
  );
};
