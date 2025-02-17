// src/pages/Dashboard.tsx
import React from "react";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { useDemoData } from "@mui/x-data-grid-generator";
import { Typography, Button, Box } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";

interface TokenPayload {
  email: string;
  user_id: string;
  exp: number;
  iat: number;
}

// const VISIBLE_FIELDS = ['name', 'rating', 'country', 'dateCreated', 'isAdmin'];

export default function Dashboard() {
  const { accessToken } = useAuth();

  // Decode the JWT token to extract user info
  let userInfo: TokenPayload | null = null;
  if (accessToken) {
    try {
      userInfo = jwtDecode<TokenPayload>(accessToken);
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }

  const { data, loading } = useDemoData({
    dataSet: "Employee",
    // visibleFields: VISIBLE_FIELDS,
    rowLength: 100,
  });

  return (
    <Box sx={{ padding: 2 }}>
      {/* User Info Header */}
      <Box
        sx={{
          marginBottom: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {userInfo ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body1">User: {userInfo.email}</Typography>
              <Typography variant="body1">ID: {userInfo.user_id}</Typography>
            </Box>
          ) : (
            <Typography variant="body1">
              Something went wrong. Please contact support
            </Typography>
          )}
          <Button variant="contained">Refresh Data</Button>
        </Box>
      </Box>
      {userInfo ? (
        <div style={{ height: 800, width: "100%" }}>
          <DataGrid
            {...data}
            loading={loading}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
            pageSizeOptions={[25, 50, 100]}
            slots={{ toolbar: GridToolbar }}
          />
        </div>
      ) : (
        <Typography variant="body1">No Data Available</Typography>
      )}
    </Box>
  );
}
