import React from "react";
import "./App.css";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/system";
import AppTheme from "./theme/AppTheme";
import { CssBaseline } from "@mui/material";
import ColorModeSelect from "./theme/ColorModeSelect";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
const Login = React.lazy(() => import("./pages/login"));
const Dashboard = React.lazy(() => import("./pages/dashboard"));

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  // Navigate,
} from "react-router";
function App() {
  const location = useLocation();
  return (
    <>
      <div className="app_container">
        {location.pathname.toLowerCase() !== "/" &&
        location.pathname.toLowerCase() !== "/signin" ? (
          <Navbar />
        ) : (
          <ColorModeSelect
            sx={{ position: "fixed", top: "1rem", right: "1rem" }}
          />
        )}

        <React.Suspense
          fallback={
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  animation: `${pulse} 1.5s ease-in-out infinite`,
                  animationDelay: "75ms",
                }}
              >
                Loading...
              </Typography>
            </Box>
          }
        >
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Routes>
        </React.Suspense>
      </div>
    </>
  );
}

export default function AppWrapper(props: { disableCustomTheme?: boolean }) {
  return (
    <AuthProvider>
    <Router>
      <AppTheme {...props}>
        <CssBaseline enableColorScheme />
        <App />
      </AppTheme>
    </Router>
    </AuthProvider>
  );
}
