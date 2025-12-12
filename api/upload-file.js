// File upload endpoint for license documents with image PDF support
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Global file storage (shared across instances within same deployment)
global.globalFilesStorage = global.globalFilesStorage || null;

// Initialize global storage if needed
function initializeGlobalStorage() {
  if (global.globalFilesStorage === null || global.globalFilesStorage === undefined) {
    global.globalFilesStorage = [];
    console.log('Initialized empty global files storage');
  }
  return global.globalFilesStorage;
}

// Add file to global storage
function addFileToGlobal(file) {
  const files = initializeGlobalStorage();
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

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
      console.log('=== FILE UPLOAD PARSING ===');
      console.log('Parsed fields:', fields);
      console.log('Parsed files:', Object.keys(files));
      console.log('Files detail:', files);
    } catch (parseError) {
      console.error('Form parsing error:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Form parsing failed',
        message: 'ファイルの解析に失敗しました',
        details: parseError.message
      });
    }

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

    // Validate file type (PDF only) - more flexible validation
    const fileName = uploadedFile.originalFilename || '';
    const mimeType = uploadedFile.mimetype || '';
    const isValidPDF = 
      mimeType.includes('pdf') || 
      mimeType.includes('application/pdf') ||
      fileName.toLowerCase().endsWith('.pdf') ||
      mimeType === 'application/octet-stream'; // Sometimes PDFs are sent as octet-stream
    
    console.log('File validation:', {
      fileName,
      mimeType,
      isValidPDF,
      endsWithPdf: fileName.toLowerCase().endsWith('.pdf')
    });

    if (!isValidPDF) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: `PDFファイルのみアップロード可能です。受信したファイル: ${fileName} (${mimeType})`
      });
    }

    // Read file content
    let fileBuffer, base64Content;
    try {
      console.log('Reading file from:', uploadedFile.filepath);
      fileBuffer = fs.readFileSync(uploadedFile.filepath);
      base64Content = fileBuffer.toString('base64');
      console.log('File content length:', base64Content.length);
    } catch (readError) {
      console.error('File reading error:', readError);
      return res.status(500).json({
        success: false,
        error: 'File reading failed',
        message: 'ファイルの読み込みに失敗しました'
      });
    }
    
    // Generate file metadata
    const fileId = `file_${Date.now()}`;
    const originalName = uploadedFile.originalFilename || `uploaded_${Date.now()}.pdf`;
    const orderId = fields.orderId ? parseInt(fields.orderId[0]) : null;
    
    console.log('Generated file metadata:', { fileId, originalName, orderId });
    
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

    // Add to global storage directly (more reliable in Vercel)
    addFileToGlobal(fileRecord);
    
    console.log("=== FILE STORAGE DEBUG ===");
    console.log("File uploaded and saved to global storage:", fileId);
    console.log("Current global storage count:", global.globalFilesStorage ? global.globalFilesStorage.length : 0);
    console.log("All file IDs in storage:", global.globalFilesStorage ? global.globalFilesStorage.map(f => f.id) : []);
    console.log("Uploaded file details:", {
      id: fileRecord.id,
      orderId: fileRecord.orderId,
      originalName: fileRecord.originalName,
      hasContent: !!fileRecord.content,
      contentLength: fileRecord.content ? fileRecord.content.length : 0
    });
    console.log("=== END FILE STORAGE DEBUG ===");
    
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