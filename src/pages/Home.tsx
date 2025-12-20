import { Stack, Typography } from "@mui/material";
import { Helmet } from "react-helmet-async";
import { AppList } from "../components/AppList";

export const Home = () => {
  return (
    <Stack spacing={3}>
      <Helmet>
        <title>steefware — curated tools</title>
        <meta
          name="description"
          content="A curated superapp for lightweight tools and experiments."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "Steef",
            url: "https://steefware.com",
            sameAs: ["https://steefware.com"],
          })}
        </script>
      </Helmet>

      <Stack spacing={1}>
        <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.6rem" } }}>
          steefware
        </Typography>
        <Typography variant="body1">
          A curated superapp for lightweight tools and experiments.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Clean, fast, predictable utilities for people who care about clarity and
          precision.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Tip: press Esc or Enter to toggle focus between UI and the background.
        </Typography>
      </Stack>

      <AppList />
    </Stack>
  );
};
