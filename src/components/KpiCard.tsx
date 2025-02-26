import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { Gauge } from "@mui/x-charts/Gauge";

interface KpiCardProps {
  title: string;
  value: number;
}

export default function KpiCard({ title, value }: KpiCardProps) {
  return (
    <Box sx={{ minWidth: 275 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography
            gutterBottom
            sx={{ color: "text.secondary", fontSize: 14 }}
          >
            {title}
          </Typography>
          <Typography variant="h5" component="div">
            {value}
          </Typography>
        </CardContent>
        <CardActions>
          {/* <Button size="small">Learn More</Button> */}
          {/* <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 1, md: 3 }}
          >
            <Gauge
              width={100}
              height={100}
              value={value}
              startAngle={-90}
              endAngle={90}
            />
          </Stack> */}
        </CardActions>
      </Card>
    </Box>
  );
}
