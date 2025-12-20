import { Grid, Stack, Typography } from "@mui/material";
import { apps } from "../data/apps";
import { AppCard } from "./AppCard";

export const AppList = () => {
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" sx={{ letterSpacing: "0.12em", textTransform: "uppercase" }}>
        Tools
      </Typography>
      <Grid container spacing={2}>
        {apps.map((app) => (
          <Grid item xs={12} md={6} key={app.name}>
            <AppCard app={app} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
};
