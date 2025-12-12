// File upload endpoint for license documents with image PDF support
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Global file storage (shared across instances within same deployment)
global.globalFilesStorage = global.globalFilesStorage || [];

// Add file to global storage
function addFileToGlobal(file) {
  const files = global.globalFilesStorage;
  // Check if file already exists
  const existingIndex = files.findIndex(f => f.id === file.id);
  if (existingIndex === -1) {
    files.unshift(file);
    console.log('Added uploaded file to global storage:', file.id);
  } else {
    files[existingIndex] = file; // Update existing
    console.log('Updated uploaded file in global storage:', file.id);
  }
  return files;
}

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("File upload request received");
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    
    // Parse multipart form data
    const form = formidable({
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      allowEmptyFiles: false
    });

    const [fields, files] = await form.parse(req);
    console.log('Parsed fields:', fields);
    console.log('Parsed files:', files);

    // Get the uploaded file
    const uploadedFile = files.file && files.file[0];
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'ファイルが選択されていません'
      });
    }

    console.log('Uploaded file info:', {
      originalFilename: uploadedFile.originalFilename,
      mimetype: uploadedFile.mimetype,
      size: uploadedFile.size,
      filepath: uploadedFile.filepath
    });

    // Validate file type (PDF only)
    if (!uploadedFile.mimetype || !uploadedFile.mimetype.includes('pdf')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'PDFファイルのみアップロード可能です'
      });
    }

    // Read file content
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
    const base64Content = fileBuffer.toString('base64');
    
    // Generate file metadata
    const fileId = `file_${Date.now()}`;
    const originalName = uploadedFile.originalFilename || `uploaded_${Date.now()}.pdf`;
    const orderId = fields.orderId ? parseInt(fields.orderId[0]) : null;
    
    const fileRecord = {
      id: fileId,
      orderId: orderId,
      filename: `uploaded_${Date.now()}.pdf`,
      originalName: originalName,
      uploadDate: new Date().toISOString(),
      size: `${(uploadedFile.size / 1024 / 1024).toFixed(1)}MB`,
      type: uploadedFile.mimetype,
      content: base64Content // Store actual file content
    };

    // Add to global storage
    addFileToGlobal(fileRecord);
    
    console.log("File uploaded and saved to global storage:", fileId);
    
    return res.status(200).json({ 
      success: true,
      message: "ファイルを受け付けました",
      fileId: fileId,
      filename: originalName,
      size: fileRecord.size,
      note: "画像PDFファイルが正常にアップロードされました"
    });

  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "ファイルアップロード中にエラーが発生しました"
    });
  }
}

// Vercel specific configuration for file uploads
export const config = {
  api: {
    bodyParser: false, // Disable body parser to handle multipart/form-data with formidable
  },
}