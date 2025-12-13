// File upload endpoint for license documents with Blob storage + fallback
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { saveFile, saveFileContent } from '../lib/kv-database.js';

// フォールバック用メモリストレージ
let fallbackFiles = [];
let useBlobStorage = true;

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
      type: uploadedFile.mimetype
    };

    // Save with fallback functionality
    if (useBlobStorage) {
      try {
        console.log("Attempting to save file to Blob...");
        await saveFile(fileRecord);
        await saveFileContent(fileId, base64Content);
        console.log("File saved to Blob successfully:", fileId);
      } catch (blobError) {
        console.error("Blob save error, falling back to memory:", blobError);
        useBlobStorage = false;
        
        // フォールバックでメモリに保存
        const fileWithContent = {
          ...fileRecord,
          content: base64Content
        };
        fallbackFiles.unshift(fileWithContent);
        console.log("File saved to fallback memory:", fileId);
      }
    } else {
      // メモリベース処理
      const fileWithContent = {
        ...fileRecord,
        content: base64Content
      };
      fallbackFiles.unshift(fileWithContent);
      console.log("File saved to fallback memory:", fileId);
    }
    
    console.log("=== FILE STORAGE DEBUG ===");
    console.log("File upload completed:", fileId);
    console.log("Uploaded file details:", {
      id: fileRecord.id,
      orderId: fileRecord.orderId,
      originalName: fileRecord.originalName
    });
    console.log("=== END FILE STORAGE DEBUG ===");

    } catch (apiError) {
      console.error('Error calling files API:', apiError);
      // Continue despite API error - file is still uploaded to global storage
    }
    console.log("=== END FILES API REGISTRATION ===");
    
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