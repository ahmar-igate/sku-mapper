import React, { useEffect, useState } from "react";
import {
  DataGridPro,
  GridToolbarContainer,
  GridToolbarProps,
  GridActionsCellItem,
  GridRowModes,
  GridRowEditStopReasons,
  GridToolbar,
  GridEventListener,
} from "@mui/x-data-grid-pro";
import { GridColDef, GridRowsProp, GridRowModesModel } from "@mui/x-data-grid";
import { Typography, Button, Box, Snackbar, Alert } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { jwtDecode } from "jwt-decode";
import api from "../api/axiosInstance";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import PublicIcon from "@mui/icons-material/Public";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SourceIcon from "@mui/icons-material/Source";
// import { Scrollbar } from "smooth-scrollbar-react";
import CancelIcon from "@mui/icons-material/Close";
import KPICard from "../components/KpiCard";

/* ---------------------------------------------------------------------------
   Module Augmentation
   This tells TypeScript that the default toolbar props include our custom props.
--------------------------------------------------------------------------- */
declare module "@mui/x-data-grid" {
  interface ToolbarPropsOverrides {
    setRows: React.Dispatch<React.SetStateAction<GridRowsProp>>;
    setRowModesModel: React.Dispatch<React.SetStateAction<GridRowModesModel>>;
  }
}

/* ---------------------------------------------------------------------------
   Custom Toolbar Component
   The type below extends GridToolbarProps so that the DataGridPro slot
   props (of type GridToolbarProps & ToolbarPropsOverrides) will include
   setRows and setRowModesModel.
--------------------------------------------------------------------------- */
type EditToolbarProps = GridToolbarProps & {
  setRows: React.Dispatch<React.SetStateAction<GridRowsProp>>;
  setRowModesModel: React.Dispatch<React.SetStateAction<GridRowModesModel>>;
};

export function EditToolbar(props: EditToolbarProps) {
  const { setRows, setRowModesModel } = props;

  const handleClick = () => {
    const id = Math.floor(Math.random() * 1000000);
    // Add a new row with initial empty fields and an 'isNew' flag
    setRows((oldRows) => [
      ...oldRows,
      {
        id,
        marketplace_sku: "",
        asin: "",
        im_sku: "",
        region: "",
        sales_channel: "",
        level_1: "",
        linworks_title: "",
        modified_by: "",
        comment: "",
        isNew: true,
      },
    ]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: "im_sku" },
    }));
  };

  return (
    <GridToolbarContainer>
      <Button color="primary" startIcon={<AddIcon />} onClick={handleClick}>
        Add record
      </Button>
      <GridToolbar />
    </GridToolbarContainer>
  );
}

/* ---------------------------------------------------------------------------
   Dashboard Component
--------------------------------------------------------------------------- */
interface TokenPayload {
  email: string;
  user_id: string;
  exp: number;
  iat: number;
}

interface KpiData {
  null_im_sku: number;
  unique_im_sku: number;
  unique_marketplace_sku: number;
  unique_regions: number;
}

export default function Dashboard() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    null_im_sku: 0,
    unique_im_sku: 0,
    unique_marketplace_sku: 0,
    unique_regions: 0,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackSeverity, setFeedbackSeverity] = useState<
    "success" | "error" | "info"
  >("info");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  // State for controlling row edit modes
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 90, editable: false },
    {
      field: "marketplace_sku",
      headerName: "Marketplace SKU",
      width: 200,
      editable: false,
    },
    { field: "asin", headerName: "ASIN", width: 200, editable: false },
    {
      field: "im_sku",
      headerName: "Linnworks SKU",
      width: 200,
      editable: true,
    },
    { field: "region", headerName: "Region", width: 100, editable: false },
    {
      field: "sales_channel",
      headerName: "Sales Channel",
      width: 200,
      editable: true,
    },
    {
      field: "level_1",
      headerName: "Linnworks Category",
      width: 200,
      editable: true,
    },
    {
      field: "linworks_title",
      headerName: "Linnworks Title",
      width: 300,
      editable: true,
    },
    {
      field: "modified_by",
      headerName: "Mapped By",
      width: 200,
      editable: false,
    },
    { field: "comment", headerName: "Comment", width: 150, editable: true },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem
              key="save"
              icon={<SaveIcon />}
              label="Save"
              onClick={() =>
                setRowModesModel({
                  ...rowModesModel,
                  [id]: { mode: GridRowModes.View },
                })
              }
              color="primary"
            />,
            <GridActionsCellItem
              key="cancel"
              icon={<CancelIcon />}
              label="Cancel"
              onClick={() => {
                setRowModesModel({
                  ...rowModesModel,
                  [id]: { mode: GridRowModes.View, ignoreModifications: true },
                });
                const editedRow = rows.find((row) => row.id === id);
                if (editedRow?.isNew) {
                  setRows(rows.filter((row) => row.id !== id));
                }
              }}
              color="inherit"
            />,
          ];
        }
        return [
          <GridActionsCellItem
            key="edit"
            icon={<EditIcon />}
            label="Edit"
            onClick={() =>
              setRowModesModel({
                ...rowModesModel,
                [id]: { mode: GridRowModes.Edit },
              })
            }
            color="inherit"
          />,
        ];
      },
    },
  ];

  // API call to fetch dashboard data
  const fetchData = () => {
    if (accessToken) {
      setLoading(true);
      api
        .get("/dashboard")
        .then((response) => {
          setRows(response.data.mapping_data);
          setKpiData({
            null_im_sku: response.data.null_im_sku,
            unique_im_sku: response.data.unique_im_sku,
            unique_marketplace_sku: response.data.unique_marketplace_sku,
            unique_regions: response.data.unique_regions,
          });
        })
        .catch((error) => {
          console.error("Error fetching dashboard data:", error);
          setFeedbackMessage("Error fetching dashboard data.");
          setFeedbackSeverity("error");
          setSnackbarOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // Save mapping via API
  const saveMapping = () => {
    if (accessToken) {
      setLoading(true);
      api
        .post("/save_mapping/", { mapping_data: rows })
        .then(() => {
          setFeedbackMessage("Mapping saved successfully!");
          setFeedbackSeverity("success");
          setSnackbarOpen(true);
        })
        .catch((error) => {
          console.error("Error saving mapping:", error);
          setFeedbackMessage("Error saving mapping.");
          setFeedbackSeverity("error");
          setSnackbarOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  // Refresh data via API
  const refreshData = () => {
    if (accessToken) {
      setLoading(true);
      api
        .get("/new_mapping")
        .then((response) => {
          if (response.data.message === "success") {
            fetchData();
          } else {
            console.log("An unknown error occurred on server");
          }
        })
        .catch((error) => {
          console.error("Error while getting new mapping:", error);
          setFeedbackMessage("Error refreshing data.");
          setFeedbackSeverity("error");
          setSnackbarOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      console.log("Token error");
    }
  };

  // processRowUpdate is triggered when a row edit is committed
  const processRowUpdate = async (updatedRow: any) => {
    if (!userInfo) {
      console.error("User info not available");
      return updatedRow;
    }
  
    // Set the modified_by field to the logged-in user's email
    const updatedRowWithUser = {
      ...updatedRow,
      modified_by: userInfo.email, // Update modified_by with the logged-in user's email
    };
  
    try {
      const response = await api.put(
        `/update_mapping/${updatedRow.id}`,
        updatedRowWithUser
      );

      if (response.data){
        setFeedbackMessage(response.data.message);
        setFeedbackSeverity("success");
        setSnackbarOpen(true);
      }
      // console.log("res: ", response.data);

  
      const updated = { ...updatedRowWithUser, isNew: false, ...response.data };
  
      setRows((prevRows) =>
        prevRows.map((row) => (row.id === updatedRow.id ? updated : row))
      );
  
      return updated;
    } catch (error: any) {
      if (error.response) {
        setFeedbackMessage(
          `Error: ${error.response.data.message || error.response.statusText}`
        );
      } else if (error.request) {
        setFeedbackMessage("No response from server. Please try again later.");
      } else {
        setFeedbackMessage("An unexpected error occurred.");
      }
      setFeedbackSeverity("error");
      setSnackbarOpen(true);
      throw error;
    }
  };
  

  const handleProcessRowUpdateError = (error: any) => {
    console.error("Row update failed:", error);
  };

  // Prevent row edit from stopping on row focus out
  const handleRowEditStop: GridEventListener<"rowEditStop"> = (
    params,
    event
  ) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  let userInfo: TokenPayload | null = null;
  if (accessToken) {
    try {
      userInfo = jwtDecode<TokenPayload>(accessToken);
    } catch (error) {
      console.error("Error decoding token:", error);
    }
  }

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  const KPICards = [
    {
      title: "Linnwork SKUs To Be Mapped",
      value: kpiData.null_im_sku,
      icon: <PendingActionsIcon />,
    },
    {
      title: "Unique Linnwork SKUs",
      value: kpiData.unique_im_sku,
      icon: <Inventory2Icon />,
    },
    {
      title: "Unique Marketplace SKUs",
      value: kpiData.unique_marketplace_sku,
      icon: <SourceIcon />,
    },
    {
      title: "Total Regions",
      value: kpiData.unique_regions,
      icon: <PublicIcon />,
    },
  ];

  return (
    <Box sx={{ padding: 2 }}>
      {/* Header and actions */}
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
              Something went wrong. Please contact support.
            </Typography>
          )}
          {rows.length !== 0 && (
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant={loading ? "outlined" : "contained"}
                onClick={refreshData}
                disabled={loading}
              >
                Refresh Data
              </Button>
              <Button
                variant={loading ? "outlined" : "contained"}
                onClick={saveMapping}
                disabled={loading}
              >
                Save Mapping
              </Button>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            marginBottom: 2,
            display: "flex",
            flexDirection: "row",
            gap: 4,
          }}
        >
          {KPICards.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
            />
          ))}
        </Box>
      </Box>
      {/* DataGridPro */}
      {userInfo ? (
        // <Scrollbar
        //   damping={0.07}
        //   thumbMinSize={20}
        //   style={{ height: 700, width: "100%" }}
        // >
        <div style={{ height: "100vh", width: "100%", scrollBehavior: "smooth" }}>
          <DataGridPro
            rows={rows}
            columns={columns}
            loading={loading}
            editMode="row"
            rowModesModel={rowModesModel}
            onRowModesModelChange={(newModel) => setRowModesModel(newModel)}
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}
            onProcessRowUpdateError={handleProcessRowUpdateError}
            disableRowSelectionOnClick
            pagination
            initialState={{
              pagination: { paginationModel: { pageSize: 50 } },
            }}
            pageSizeOptions={[50, 100, 200, 500, { value: -1, label: "All" }]}
            slots={{ toolbar: EditToolbar }}
            slotProps={{ toolbar: { setRows, setRowModesModel } }}
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                position: "sticky",
                top: 0,
                zIndex: 100,
                backgroundColor: "white", // or use your theme's background color
              },
              "& .MuiDataGrid-virtualScroller": {
                marginTop: 0, // ensure there's no extra offset
              },
            }}
          />
        </div>
      ) : (
        // </Scrollbar>
        <Typography variant="body1">No Data Available</Typography>
      )}
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={feedbackSeverity}
          sx={{ width: "100%" }}
        >
          {feedbackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
