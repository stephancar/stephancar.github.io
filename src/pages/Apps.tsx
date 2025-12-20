import { Stack, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";
import { AppList } from "../components/AppList";

export const Apps = () => {
  return (
    <Stack spacing={2}>
      <Helmet>
        <title>Apps — steefware</title>
        <meta
          name="description"
          content="A curated collection of steefware tools and experiments."
        />
      </Helmet>
      <Typography variant="h2" sx={{ fontSize: { xs: "1.6rem", md: "2rem" } }}>
        Apps
      </Typography>
      <Typography color="text.secondary">
        Each tool opens in its own dedicated experience, hosted separately and linked
        from here.
      </Typography>
      <AppList />
    </Stack>
  );
};
