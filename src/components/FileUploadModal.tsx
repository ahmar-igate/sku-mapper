import React, { useCallback, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  LinearProgress,
  Alert,
  styled,
  useTheme,
  AlertTitle,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../api/axiosInstance';

// Styled components
const UploadBox = styled(Paper)(({ theme }) => ({
  border: `2px dashed ${theme.palette.primary.main}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(0, 0, 0, 0.05)' 
    : 'rgba(0, 0, 150, 0.03)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.1)' 
      : 'rgba(0, 0, 150, 0.05)',
    transform: 'scale(1.01)',
  },
}));

const FileItem = styled(Paper)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  marginTop: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  borderRadius: theme.shape.borderRadius,
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

// Required CSV fields - remove the user-specified fields
const REQUIRED_FIELDS = [
  'ID', 'Date', 'Marketplace SKU', 'ASIN', 'Linnworks SKU', 'Parent SKU', 
  'Region', 'Sales Channel', 'Linnworks Category', 'Amazon Title', 
  'Linnworks Title'
  // Removed: 'Mapped By SCM', 'Mapped By Finance', 'Mapped By Admin', 
  // 'Comment by SCM', 'Comment by Finance'
];

// Define the maximum number of records allowed
const MAX_RECORDS = 1000;

interface FileUploadModalProps {
  open: boolean;
  handleClose: () => void;
  accessToken: string | null;
  department: string | undefined;
  userEmail: string;
  setLoading: (loading: boolean) => void;
  setFeedbackMessage: (message: string) => void;
  setFeedbackSeverity: (severity: 'success' | 'error' | 'info' | 'warning') => void;
  setSnackbarOpen: (open: boolean) => void;
  refreshData?: () => void;
}

export default function FileUploadModal({
  open,
  handleClose,
  accessToken,
  department,
  userEmail,
  setLoading,
  setFeedbackMessage,
  setFeedbackSeverity,
  setSnackbarOpen,
  refreshData,
}: FileUploadModalProps) {
  const theme = useTheme();
  const isReadOnly = (department || '').toUpperCase() === 'READ_ONLY';
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [fileValidation, setFileValidation] = useState<{
    isValid: boolean;
    message: string;
    missingFields: string[];
  } | null>(null);
  const [progressIntervalId, setProgressIntervalId] = useState<NodeJS.Timeout | undefined>(undefined);

  // Validate CSV content
  const validateCSV = async (file: File): Promise<{
    isValid: boolean;
    message: string;
    missingFields: string[];
  }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) {
          resolve({
            isValid: false,
            message: 'Could not read file content',
            missingFields: []
          });
          return;
        }
        
        // Split content into lines
        const lines = content.split(/\r\n|\n/);
        
        // Check if file has at least 2 lines (header + at least one record)
        if (lines.length < 2) {
          resolve({
            isValid: false,
            message: 'CSV file must contain at least one record besides the header',
            missingFields: []
          });
          return;
        }
        
        // Check for empty file or just header
        if (lines.length === 2 && lines[1].trim() === '') {
          resolve({
            isValid: false,
            message: 'CSV file must contain at least one record besides the header',
            missingFields: []
          });
          return;
        }
        
        // Check for maximum records (lines.length - 1 for header)
        if (lines.length - 1 > MAX_RECORDS) {
          resolve({
            isValid: false,
            message: `CSV file exceeds the maximum allowed ${MAX_RECORDS} records.`,
            missingFields: []
          });
          return;
        }
        
        // Get headers from first line and normalize them
        // const headers = lines[0].split(',').map(header => header.trim());
        // Get the first line (header row)
        const headerLine = lines[0].trim();

        // Detect delimiter: tab or comma
        let delimiter = ',';
        if (headerLine.includes('\t')) {
            delimiter = '\t';
        }

        // Split headers using detected delimiter
        const headers = headerLine.split(delimiter).map(header => header.trim());
        console.log('CSV Headers:', headers); // Debug log

        
        // Check for required fields
        const missingFields = REQUIRED_FIELDS.filter(
          field => !headers.some(header => 
            header.toLowerCase() === field.toLowerCase()
          )
        );
        console.log(missingFields);
        if (missingFields.length > 0) {
          resolve({
            isValid: false,
            message: 'CSV file is missing required fields',
            missingFields
          });
          return;
        }
        
        resolve({
          isValid: true,
          message: 'CSV file is valid',
          missingFields: []
        });
      };
      
      reader.onerror = () => {
        resolve({
          isValid: false,
          message: 'Error reading file',
          missingFields: []
        });
      };
      
      reader.readAsText(file);
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isReadOnly) return;
    // Only use the first file if multiple are uploaded
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // Reset validation state
    setFileValidation(null);
    
    // Check file type
    if (file.type !== 'text/csv') {
      setFeedbackMessage('Invalid file type. Only CSV files are accepted.');
      setFeedbackSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Validate CSV content
    const validation = await validateCSV(file);
    setFileValidation(validation);
    
    if (!validation.isValid) {
      setFeedbackMessage(validation.message);
      setFeedbackSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Replace any existing file with the new one
    setFiles([file]);
  }, [setFeedbackMessage, setFeedbackSeverity, setSnackbarOpen, isReadOnly]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: isReadOnly,
  });

  const removeFile = () => {
    setFiles([]);
  };

  const handleUpload = async () => {
    if (isReadOnly) {
      setFeedbackMessage('Read-only users cannot upload files.');
      setFeedbackSeverity('warning');
      setSnackbarOpen(true);
      return;
    }
    if (files.length === 0 || !accessToken) return;
    
    // Double-check validation before upload
    if (!fileValidation?.isValid) {
      setFeedbackMessage('Please upload a valid CSV file with required fields');
      setFeedbackSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setLoading(true);
    
    let progressInterval: NodeJS.Timeout | undefined = undefined;

    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('department', department || '');
    formData.append('user_email', userEmail || '');
    
    try {
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);

      setProgressIntervalId(progressInterval);
      
      // Updated endpoint from '/upload_bulk_mapping' to '/update_mapping_bulk/'
      const response = await api.post('/update_mapping_bulk/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setProgressIntervalId(undefined);
      setUploadProgress(100);
      
      if (response.data) {
        const successMessage = response.data.message || 
                              `Upload successful! ${response.data.rows_processed || 0} rows processed.`;
        
        setUploadResult({
          success: true,
          message: successMessage
        });
        
        setFeedbackMessage(successMessage);
        setFeedbackSeverity('success');
        
        // Clear files after successful upload
        setTimeout(() => {
          setFiles([]);
          if (refreshData) refreshData();
        }, 1500);
      }
    } catch (error: any) {
      // Only clear the interval if it exists
      if (progressInterval) {
        clearInterval(progressInterval);
        setProgressIntervalId(undefined);
      }
      setUploadProgress(0);
      
      let errorMessage = 'An error occurred during upload.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Bulk upload error:', error);
      
      setUploadResult({
        success: false,
        message: errorMessage
      });
      
      setFeedbackMessage(errorMessage);
      setFeedbackSeverity('error');
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
      setUploading(false);
    }
  };

  // Add a function to dismiss file validation errors
  const clearFileValidationError = () => {
    setFileValidation(null);
    // Remove the file too since it's invalid
    setFiles([]);
  };

  // Add function to clear the upload result
  const clearUploadResult = () => {
    setUploadResult(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="file-upload-dialog-title"
    >
      <DialogTitle id="file-upload-dialog-title" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h5" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
          <CloudUploadIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          Bulk Upload File
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ color: theme.palette.grey[500] }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            Upload a CSV file containing updated SKU mapping data. Make sure to upload just updated records.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Supported file type: .csv (Maximum records: {MAX_RECORDS})
          </Typography>
          
          {/* Department-specific instructions */}
          <Box sx={{ mb: 1.1, mt:2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom sx={{color: theme.palette.primary.main}}>
              Instructions
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Box component="li" sx={{ mb: 0.5 }}>
                Upload only those records that are updated instead of uploading complete mapping file.
              </Box>
              
              {department === 'SCM' && (
                <>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    Change only the concerned field value: <Typography component="span" fontWeight="bold">Linnworks SKU</Typography>, <Typography component="span" fontWeight="bold">Linnworks Title</Typography> and <Typography component="span" fontWeight="bold">Linnworks Category</Typography>.
                  </Box>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    Upload only those rows where values are null/empty.
                  </Box>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    When uploading the data the field values should not be null/empty.
                  </Box>
                </>
              )}
              
              {department === 'FINANCE' && (
                <>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    Change only the concerned field value: <Typography component="span" fontWeight="bold">Parent SKU</Typography>.
                  </Box>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    Upload only those rows where values are null/empty.
                  </Box>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    When uploading the data the field values should not be null/empty.
                  </Box>
                </>
              )}
              
              {department === 'ADMIN' && (
                <>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    Upload only those rows where values are null/empty.
                  </Box>
                  <Box component="li" sx={{ mb: 0.5 }}>
                    When uploading the data the field values should not be null/empty.
                  </Box>
                </>
              )}
            </Box>
          </Box>
          
          <Paper elevation={0} sx={{ 
            mt: 2, 
            p: 2, 
            border: '1px solid', 
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: theme.palette.background.paper
          }}>
            <Typography variant="subtitle2" sx={{ 
              mb: 1.5, 
              display: 'flex', 
              alignItems: 'center',
              color: theme.palette.primary.main
            }}>

              Required Fields
            </Typography>
            
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 1.5
            }}>
              {REQUIRED_FIELDS.map((field, index) => {
                const isMissing = fileValidation?.missingFields.includes(field);
                return (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: isMissing ? 'error.main' : 'divider',
                      bgcolor: isMissing ? 'error.light' : 'background.paper',
                      color: isMissing ? 'error.main' : 'text.primary',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: isMissing ? 'error.dark' : theme.palette.primary.light,
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      }
                    }}
                  >
                    {isMissing && (
                      <ErrorOutlineIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                    )}
                    {field}
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Box>
        
        <UploadBox {...getRootProps()} sx={{ mb: 3, cursor: isReadOnly ? 'not-allowed' : 'pointer', opacity: isReadOnly ? 0.6 : 1 }}>
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
          {isDragActive ? (
            <Typography variant="h6">Drop the file here ...</Typography>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                Drag & drop a CSV file here, or click to select
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum 1 file, {MAX_RECORDS} records
              </Typography>
              {isReadOnly && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  Read-only access: uploads are disabled.
                </Typography>
              )}
            </>
          )}
        </UploadBox>
        
        {files.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              File selected
            </Typography>
            
            <FileItem>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {fileValidation?.isValid ? (
                  <CheckCircleIcon sx={{ mr: 1, color: theme.palette.success.main }} />
                ) : (
                  <ErrorOutlineIcon sx={{ mr: 1, color: theme.palette.error.main }} />
                )}
                <Box>
                  <Typography variant="body1" component="div" noWrap sx={{ maxWidth: 400 }}>
                    {files[0].name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(files[0].size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                </Box>
              </Box>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={removeFile}
                disabled={uploading}
              >
                <DeleteIcon />
              </IconButton>
            </FileItem>
          </Box>
        )}
        
        {fileValidation && !fileValidation.isValid && (
          <Alert 
            severity="error" 
            sx={{ mt: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={clearFileValidationError}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>Invalid CSV Format</AlertTitle>
            <Typography variant="body2">
              {fileValidation.message}
            </Typography>
            {fileValidation.missingFields.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Missing fields:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {fileValidation.missingFields.map((field, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        bgcolor: 'error.light', 
                        color: 'error.contrastText', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1,
                        fontSize: '0.75rem' 
                      }}
                    >
                      {field}
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </Alert>
        )}
        
        {uploading && (
          <Alert 
            severity="info" 
            sx={{ mt: 3 }}
            icon={<CloudUploadIcon />}
            action={
              <IconButton
                aria-label="cancel"
                color="inherit"
                size="small"
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel the upload?')) {
                    setUploading(false);
                    if (progressIntervalId) {
                      clearInterval(progressIntervalId);
                      setProgressIntervalId(undefined);
                    }
                    setUploadProgress(0);
                  }
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>Uploading</AlertTitle>
            <Typography variant="body2" gutterBottom>
              {Math.round(uploadProgress)}% complete
            </Typography>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
          </Alert>
        )}
        
        {uploadResult && (
          <Alert 
            severity={uploadResult.success ? "success" : "error"} 
            sx={{ mt: 3 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={clearUploadResult}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <AlertTitle>{uploadResult.success ? "Success" : "Error"}</AlertTitle>
            {uploadResult.message}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={handleClose}
          color="inherit"
        >
          Close
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          startIcon={<CloudUploadIcon />}
          disabled={isReadOnly || files.length === 0 || uploading || !accessToken || Boolean(fileValidation && !fileValidation.isValid)}
          color="secondary"
        >
          Upload File
        </Button>
      </DialogActions>
    </Dialog>
  );
} 