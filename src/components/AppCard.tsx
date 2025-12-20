import { Card, CardActionArea, CardContent, Stack, Typography } from "@mui/material";
import TableChartIcon from "@mui/icons-material/TableChart";
import InvertColorsIcon from "@mui/icons-material/InvertColors";
import InsightsIcon from "@mui/icons-material/Insights";
import CalculateIcon from "@mui/icons-material/Calculate";
import type { AppLink } from "../data/apps";

const iconMap = {
  table: TableChartIcon,
  tank: InvertColorsIcon,
  finance: CalculateIcon,
  sim: InsightsIcon,
};

type AppCardProps = {
  app: AppLink;
};

export const AppCard = ({ app }: AppCardProps) => {
  const Icon = iconMap[app.icon];

  return (
    <Card
      elevation={0}
      sx={(theme) => ({
        border: "1px solid rgba(16, 20, 24, 0.08)",
        background:
          theme.palette.mode === "dark"
            ? "rgba(13, 18, 22, 0.72)"
            : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(6px)",
      })}
    >
      <CardActionArea
        component="a"
        href={app.href}
        target="_blank"
        rel="noreferrer"
        sx={{ padding: 2 }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Icon sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>
              {app.name}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {app.description}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
};
