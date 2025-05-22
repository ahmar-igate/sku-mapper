import * as React from "react";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";
import api from "../api/axiosInstance";
import ReportIcon from '@mui/icons-material/Report';

const BootstrapDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialogContent-root": {
    padding: theme.spacing(2),
  },
  "& .MuiDialogActions-root": {
    padding: theme.spacing(1),
  },
}));

export default function CustomizedDialogs({
  handleClose,
  open,
  rows,
  accessToken,
  setLoading,
  setFeedbackMessage,
  setFeedbackSeverity,
  setSnackbarOpen,
}: any) {
  //   const [open, setOpen] = React.useState(false);

  //   const handleClickOpen = () => {
  //     setOpen(true);
  //   };
  //   const handleClose = () => {
  //     setOpen(false);
  //   };
  const [timestamp, setTimestamp] = React.useState<string>("");

  // Save mapping via API
  const saveMapping = () => {
    if (accessToken) {
      setLoading(true);
      api
        .post("/save_mapping/", { mapping_data: rows })
        .then((response) => {
          const data = response.data;
          setTimestamp(data.timestamp);

          if (data.message) {
            // "rows_inserted" and "rows_skipped_due_to_missing_fields"
            const inserted = data.rows_inserted || 0;
            const skipped = data.rows_skipped_due_to_missing_fields || 0;

            setFeedbackMessage(
              `✅ ${data.message}\n🟢 Inserted: ${inserted} rows\n⚠️ Skipped: ${skipped} rows due to missing fields.`
            );
            setFeedbackSeverity("success");
          } else {
            setFeedbackMessage(
              "Mapping saved, but response format was unexpected."
            );
            setFeedbackSeverity("warning");
          }

          setSnackbarOpen(true);
        })
        .catch((error) => {
          console.error("Error saving mapping:", error);
          const errorMsg =
            error.response?.data?.error ||
            "An unexpected error occurred while saving mapping. Did you map any field?";
          setFeedbackMessage(`❌ ${errorMsg}`);
          setFeedbackSeverity("error");
          setSnackbarOpen(true);
        })
        .finally(() => {
          setLoading(false);
        });
    }
    handleClose();
  };

  return (
    <React.Fragment>
      <BootstrapDialog
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle sx={{ m: 0, p:1, display: "flex", alignItems:"center", lineHeight: 0, fontSize:"1.65rem", color: "#d32f2f" }} id="customized-dialog-title">
              <ReportIcon fontSize="large" sx={{mr: 1}} />
              <p>Catution</p>
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={(theme) => ({
            position: "absolute",
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent dividers>
          <Typography gutterBottom fontSize={18}>
            Are you sure you want to proceed with saving this mapping? The data
            will be permanently saved in our main table, and this action
            cannot be reversed.
          </Typography>
          <Typography gutterBottom fontSize={18}>
            Please ensure that the mapping is correct before
            proceeding. If you have any doubts, please double-check the mapping
            or consult with your team.
          </Typography>
        </DialogContent>
        <DialogActions sx={{display: "flex", justifyContent: "space-between", px:4}}>
        <Typography gutterBottom fontSize={12}>
            Last Saved: {timestamp}
          </Typography>
          <Button autoFocus onClick={saveMapping}>
            Save Mapping
          </Button>

        </DialogActions>
      </BootstrapDialog>
    </React.Fragment>
  );
}
