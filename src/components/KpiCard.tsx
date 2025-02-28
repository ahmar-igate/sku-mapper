import * as React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

export default function KpiCard({ title, value, icon }: KpiCardProps) {
  return (
    <Box sx={{ minWidth: 275 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography
            gutterBottom
            sx={{ color: "text.secondary", fontSize: 14, display: "flex", gap: 1, flexDirection: 'column',  justifyContent: "center", marginBottom:1 }}
          >
            {icon}
            
            {title}
          </Typography>
          <Typography variant="h5" marginLeft={0.1} component="div" fontSize={28}>
            {value}
          </Typography>
        </CardContent>

      </Card>
    </Box>
  );
}
