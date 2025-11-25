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
import CategoryIcon from "@mui/icons-material/Category";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
// import { Scrollbar } from "smooth-scrollbar-react";
import CancelIcon from "@mui/icons-material/Close";
import KPICard from "../components/KpiCard";
import Dialogue from "../components/Dialogue";
import FileUploadModal from "../components/FileUploadModal";
import DifferenceIcon from "@mui/icons-material/Difference";

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
  const { department } = useAuth();
  const userDepartment = department || "SCM";
  const isReadOnly = userDepartment?.toUpperCase() === "READ_ONLY";

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
        parent_sku: "",
        region: "",
        sales_channel: "",
        level_1: "",
        linworks_title: "",
        amazon_title: "",
        modified_by: "",
        modified_by_finance: "",
        modified_by_admin: "",
        comment: "",
        comment_by_finance: "",
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
      <Button color="primary" startIcon={<AddIcon />} onClick={handleClick} disabled={isReadOnly} sx={{ opacity: isReadOnly ? 0.6 : 1 }}>
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
  department?: string;
}

interface KpiData {
  null_im_sku: number;
  unique_im_sku: number;
  unique_marketplace_sku: number;
  unique_regions: number;
  lin_title_to_be_mapped?: number;
  lin_category_to_be_mapped?: number;
  null_parent_sku?: number;
  unique_parent_sku?: number;
  unique_im_sku_hvng_abondoned_items?: number;
}

export default function Dashboard() {
  const { accessToken, department } = useAuth();
  const [rows, setRows] = useState<GridRowsProp>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [kpiData, setKpiData] = useState<KpiData>({
    null_im_sku: 0,
    unique_im_sku: 0,
    unique_marketplace_sku: 0,
    unique_regions: 0,
    lin_title_to_be_mapped: 0,
    lin_category_to_be_mapped: 0,
    null_parent_sku: 0,
    unique_parent_sku: 0,
    unique_im_sku_hvng_abondoned_items: 0,
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [feedbackSeverity, setFeedbackSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

  // State for controlling row edit modes
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // Extract user information from token
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  useEffect(() => {
    if (accessToken) {
      try {
        const decoded = jwtDecode<TokenPayload>(accessToken);
        setUserEmail(decoded.email);
        setUserId(decoded.user_id);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, [accessToken]);

  // Get user department for permission-based editing
  const userDepartment = department || "SCM";
  const isReadOnly = userDepartment?.toUpperCase() === "READ_ONLY";

  // Add helper function to check if user can edit fields
  const canEdit = (department: string | null, allowedDept: string): boolean => {
    // Admin can edit everything
    if (department?.toUpperCase() === "ADMIN") return true;
    // Otherwise check specific department permission
    return department?.toUpperCase() === allowedDept;
  };

  const columns: GridColDef[] = [
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      cellClassName: "actions",
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isReadOnly) {
          return [];
        }
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
    { field: "id", headerName: "ID", width: 90, editable: false },
    { field: "date", headerName: "Date", width: 90, editable: false },
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
      editable: !isReadOnly && canEdit(userDepartment, "SCM"), // SCM and ADMIN can edit
    },
    {
      field: "parent_sku",
      headerName: "Parent SKU",
      width: 200,
      editable: !isReadOnly && canEdit(userDepartment, "FINANCE"), // FINANCE and ADMIN can edit
    },
    { field: "region", headerName: "Region", width: 100, editable: false },
    {
      field: "sales_channel",
      headerName: "Sales Channel",
      width: 200,
      editable: !isReadOnly, // Only editable for SCM, case-insensitive
    },
    {
      field: "level_1",
      headerName: "Linnworks Category",
      width: 200,
      editable: !isReadOnly, // Only editable for Finance, case-insensitive
    },

    {
      field: "amazon_title",
      headerName: "Amazon Title",
      width: 300,
      editable: false,
    },
    {
      field: "linworks_title",
      headerName: "Linnworks Title",
      width: 300,
      editable: !isReadOnly, // Only editable for SCM, case-insensitive
    },
    {
      field: "modified_by",
      headerName: "Mapped By SCM",
      width: 200,
      editable: false,
    },
    {
      field: "modified_by_finance",
      headerName: "Mapped By Finance",
      width: 200,
      editable: false,
    },
    {
      field: "modified_by_admin",
      headerName: "Mapped By Admin",
      width: 200,
      editable: false,
    },
    {
      field: "comment",
      headerName: "Comment by SCM",
      width: 150,
      editable: !isReadOnly && canEdit(userDepartment, "SCM"), // SCM and ADMIN can edit
    },
    {
      field: "comment_by_finance",
      headerName: "Comment by Finance",
      width: 180,
      editable: !isReadOnly && canEdit(userDepartment, "FINANCE"), // FINANCE and ADMIN can edit
    },
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
            lin_title_to_be_mapped: response.data.lin_title_to_be_mapped,
            lin_category_to_be_mapped:
              response.data.lin_category_to_be_mapped,
            null_parent_sku: response.data.null_parent_sku,
            unique_parent_sku: response.data.unique_parent_sku,
            unique_im_sku_hvng_abondoned_items: response.data.unique_im_sku_hvng_abondoned_items,
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

  const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  
  const handleOpenUploadModal = () => {
    setOpenUploadModal(true);
  };
  
  const handleCloseUploadModal = () => {
    setOpenUploadModal(false);
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

  // const getData = () => {
  //   if (accessToken) {
  //     setLoading(true);
  //     api
  //       .get("/dump-db")
  //       .then((response) => {
  //         if (response.data.message === "success") {
  //           fetchData();
  //         } else {
  //           console.log("An unknown error occurred on server");
  //         }
  //       })
  //       .catch((error) => {
  //         console.error("Error while getting dump-db:", error);
  //         setFeedbackMessage("Error getting data.");
  //         setFeedbackSeverity("error");
  //         setSnackbarOpen(true);
  //       })
  //       .finally(() => {
  //         setLoading(false);
  //       });
  //   }
  // }

  // processRowUpdate is triggered when a row edit is committed
  const processRowUpdate = async (updatedRow: any) => {
    if (!userEmail) {
      console.error("User info not available");
      return updatedRow;
    }

    // Set the appropriate modified_by field based on department
    const updatedRowWithUser = { ...updatedRow };

    console.log("Process row update - Department:", userDepartment);

    // Capitalize specific fields before sending to backend
    if (updatedRowWithUser.marketplace_sku && typeof updatedRowWithUser.marketplace_sku === 'string') {
      updatedRowWithUser.marketplace_sku = updatedRowWithUser.marketplace_sku.trim().toUpperCase();
    }
    if (updatedRowWithUser.asin && typeof updatedRowWithUser.asin === 'string') {
      updatedRowWithUser.asin = updatedRowWithUser.asin.trim().toUpperCase();
    }
    if (updatedRowWithUser.im_sku && typeof updatedRowWithUser.im_sku === 'string') {
      updatedRowWithUser.im_sku = updatedRowWithUser.im_sku.trim().toUpperCase();
    }
    if (updatedRowWithUser.parent_sku && typeof updatedRowWithUser.parent_sku === 'string') {
      updatedRowWithUser.parent_sku = updatedRowWithUser.parent_sku.trim().toUpperCase();
    }
    if (updatedRowWithUser.region && typeof updatedRowWithUser.region === 'string') {
      updatedRowWithUser.region = updatedRowWithUser.region.trim().toUpperCase();
    }
    if (updatedRowWithUser.level_1 && typeof updatedRowWithUser.level_1 === 'string') {
      updatedRowWithUser.level_1 = updatedRowWithUser.level_1.trim().toUpperCase();
    }
    if (updatedRowWithUser.sales_channel && typeof updatedRowWithUser.sales_channel === 'string') {
      // Capitalize only first letter for sales_channel
      const trimmed = updatedRowWithUser.sales_channel.trim();
      updatedRowWithUser.sales_channel = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    }

    // Determine which field to update based on user's department
    // Clear all department fields first to avoid confusion
    updatedRowWithUser.modified_by = null;
    updatedRowWithUser.modified_by_finance = null;
    updatedRowWithUser.modified_by_admin = null;

    if (userDepartment?.toUpperCase() === "SCM") {
      console.log("Setting modified_by for SCM user:", userEmail);
      updatedRowWithUser.modified_by = userEmail;
    } else if (userDepartment?.toUpperCase() === "FINANCE") {
      console.log("Setting modified_by_finance for Finance user:", userEmail);
      updatedRowWithUser.modified_by_finance = userEmail;
    } else if (userDepartment?.toUpperCase() === "ADMIN") {
      console.log("Setting modified_by_admin for Admin user:", userEmail);
      updatedRowWithUser.modified_by_admin = userEmail;
    }

    try {
      // Log the data being sent to the server
      console.log("Sending data to server:", updatedRowWithUser);

      const response = await api.put(
        `/update_mapping/${updatedRow.id}`,
        { ...updatedRowWithUser, department: userDepartment }
      );
      console.log("Server response:", response.data);

      if (response.data) {
        console.log("Response from server:", response.data);
        setFeedbackMessage(response.data.message);
        setFeedbackSeverity("success");
        setSnackbarOpen(true);
      }

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

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  // Add this useEffect after your existing useEffects
  useEffect(() => {
    console.log("Current department:", userDepartment);
    console.log("Department from context:", department);

    // Log which modified_by field will be updated
    if (userDepartment?.toUpperCase() === "SCM") {
      console.log("User is SCM, will update modified_by field");
    } else if (userDepartment?.toUpperCase() === "FINANCE") {
      console.log("User is FINANCE, will update modified_by_finance field");
    } else if (userDepartment?.toUpperCase() === "ADMIN") {
      console.log("User is ADMIN, will update modified_by_admin field");
    }

    // Log whether columns should be editable based on department
    console.log("Comment editable by SCM?", canEdit(userDepartment, "SCM"));
    console.log(
      "Comment by Finance editable by Finance?",
      canEdit(userDepartment, "FINANCE")
    );
    console.log(
      "Is admin with full permissions?",
      userDepartment?.toUpperCase() === "ADMIN"
    );

    // Try case-insensitive comparison and log results
    console.log(
      "Case-insensitive compare - SCM?",
      userDepartment?.toUpperCase() === "SCM"
    );
    console.log(
      "Case-insensitive compare - FINANCE?",
      userDepartment?.toUpperCase() === "FINANCE"
    );
    console.log(
      "Case-insensitive compare - ADMIN?",
      userDepartment?.toUpperCase() === "ADMIN"
    );

    if (userDepartment) {
      console.log("Department type:", typeof userDepartment);
      console.log(
        "Department char codes:",
        Array.from(userDepartment).map((c) => c.charCodeAt(0))
      );
    }
  }, [userDepartment, department]);

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
      title: "Parent SKUs To Be Mapped",
      value: kpiData.null_parent_sku,
      icon: <PrecisionManufacturingIcon />,
    },
    {
      title: "Unique Parent SKUs",
      value: kpiData.unique_parent_sku,
      icon: <DifferenceIcon />,
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
    {
      title: "Linnworks Title To Be Mapped",
      value: kpiData.lin_title_to_be_mapped,
      icon: <SubtitlesIcon />,
    },
    {
      title: "Linnworks Category To Be Mapped",
      value: kpiData.lin_category_to_be_mapped,
      icon: <CategoryIcon />,
    },
    {
      title: "Unique Linnwork SKUs Having Abondoned Items",
      value: kpiData.unique_im_sku_hvng_abondoned_items,
      icon: <CategoryIcon />,
    },
  ];

  console.log("Linnwork SKUS Having Abondoned Items:", kpiData.unique_im_sku_hvng_abondoned_items);
  

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
          {userEmail && userId ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="body1">User: {userEmail}</Typography>
              <Typography variant="body1">ID: {userId}</Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Department: {userDepartment}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body1">
              Something went wrong. Please contact support.
            </Typography>
          )}
          {rows.length !== 0 && (
            <Box sx={{ display: "flex", gap: 2 }}>
              {/* <Button
                variant={loading ? "outlined" : "contained"}
                onClick={getData}
                disabled={loading || isReadOnly}
                color={isReadOnly ? "inherit" : undefined}
                sx={{
                  opacity: isReadOnly ? 0.6 : 1,
                  pointerEvents: isReadOnly ? "none" : "auto",
                }}
              >
                Get Data
              </Button> */}
                <Button
                variant={loading ? "outlined" : "contained"}
                onClick={handleOpenUploadModal}
                disabled={loading || isReadOnly}
                color={isReadOnly ? "inherit" : undefined}
                sx={{
                  opacity: isReadOnly ? 0.6 : 1,
                  pointerEvents: isReadOnly ? "none" : "auto",
                }}
              >
                Bulk upload
              </Button>
              <Button
                variant={loading ? "outlined" : "contained"}
                onClick={refreshData}
                disabled={loading || isReadOnly}
                color={isReadOnly ? "inherit" : undefined}
                sx={{
                  opacity: isReadOnly ? 0.6 : 1,
                  pointerEvents: isReadOnly ? "none" : "auto",
                }}
              >
                Refresh Data
              </Button>
              <Button
                variant={loading ? "outlined" : "contained"}
                onClick={handleClickOpen}
                disabled={loading || isReadOnly}
                color={isReadOnly ? "inherit" : undefined}
                sx={{
                  opacity: isReadOnly ? 0.6 : 1,
                  pointerEvents: isReadOnly ? "none" : "auto",
                }}
              >
                Save Mapping
              </Button>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            marginBottom: 2,
            marginTop: 2,
            display: "flex",
            flexWrap: "wrap",
            flexDirection: "row",
            gap: 2,
          }}
        >
          {KPICards.map((kpi, index) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value ?? 0}
              icon={kpi.icon}
            />
          ))}
        </Box>
      </Box>
      {/* DataGridPro */}
      {userEmail && userId ? (
        // <Scrollbar
        //   damping={0.07}
        //   thumbMinSize={20}
        //   style={{ height: 700, width: "100%" }}
        // >
        <div
          style={{ height: "100vh", width: "100%", scrollBehavior: "smooth" }}
        >
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
      <Dialogue
        handleClose={handleClose}
        open={open}
        rows={rows}
        accessToken={accessToken}
        setLoading={setLoading}
        setFeedbackMessage={setFeedbackMessage}
        setFeedbackSeverity={setFeedbackSeverity}
        setSnackbarOpen={setSnackbarOpen}
      />
      <FileUploadModal
        open={openUploadModal}
        handleClose={handleCloseUploadModal}
        accessToken={accessToken}
        department={userDepartment}
        userEmail={userEmail}
        setLoading={setLoading}
        setFeedbackMessage={setFeedbackMessage}
        setFeedbackSeverity={setFeedbackSeverity}
        setSnackbarOpen={setSnackbarOpen}
        refreshData={fetchData} //refresh data with /dashboard endpoint
      />
    </Box>
  );
}
