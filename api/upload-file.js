// File upload with Vercel Blob storage
import { put } from '@vercel/blob';
import { addGlobalFile } from '../lib/shared-storage.js';

export default async function handler(req, res) {
  console.log('=== BASE64 UPLOAD API ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  
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

    console.log('=== PROCESSING JSON UPLOAD ===');
    
    // Parse JSON body
    const { orderId, filename, originalName, size, type, content } = req.body;
    
    console.log('Received upload data:', {
      orderId,
      filename,
      size,
      type,
      contentLength: content ? content.length : 0
    });
    
    if (!content || !filename || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: '必要なデータが不足しています（orderId, filename, content）'
      });
    }
    
    // Generate file metadata
    const fileId = `file_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    // Convert base64 back to binary buffer
    const fileBuffer = Buffer.from(content, 'base64');
    console.log('File buffer created, size:', fileBuffer.length, 'bytes');
    
    // Validate file buffer
    if (fileBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file content',
        message: 'ファイル内容が無効です'
      });
    }
    
    // Store file record with base64 content (safer for JSON serialization)
    const fileRecord = {
      id: fileId,
      orderId: parseInt(orderId),
      filename: originalName || filename,
      originalName: originalName || filename,
      uploadDate: timestamp,
      size: `${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB`,
      type: type || 'application/pdf',
      content: content, // Store as base64 string to avoid Buffer serialization issues
      contentSize: fileBuffer.length,
      encoding: 'base64' // Indicate this is base64 encoded data
    };
    
    console.log('=== SAVING FILE TO VERCEL BLOB ===');
    console.log('File record:', {
      id: fileRecord.id,
      orderId: fileRecord.orderId,
      filename: fileRecord.filename,
      size: fileRecord.size,
      contentSize: fileRecord.contentSize
    });
    
    try {
      // Save to Vercel Blob for persistent storage
      const blobResult = await put(`files/${fileId}.pdf`, fileBuffer, {
        access: 'public',
        contentType: type || 'application/pdf'
      });
      
      console.log('File saved to Vercel Blob:', blobResult.url);
      
      // Save metadata to Blob as JSON
      const metadataRecord = {
        ...fileRecord,
        blobUrl: blobResult.url,
        storage: 'blob'
      };
      delete metadataRecord.content; // Remove base64 content since file is now in Blob
      
      const metadataBlob = await put(`metadata/${fileId}.json`, JSON.stringify(metadataRecord), {
        access: 'public',
        contentType: 'application/json'
      });
      
      console.log('Metadata saved to Vercel Blob:', metadataBlob.url);
      
      // Also keep in memory for immediate access (fallback)
      addGlobalFile(fileRecord);
      
    } catch (blobError) {
      console.error('Blob storage failed, using fallback:', blobError);
      // Fallback to memory storage
      addGlobalFile(fileRecord);
    }
    
    console.log('=== FILE SAVED SUCCESSFULLY ===');
    console.log('Global storage length:', global.fileStorage ? global.fileStorage.length : 0);
    console.log('Process PID:', process.pid);
    
    // Verify the file was actually saved
    if (global.fileStorage) {
      const savedFile = global.fileStorage.find(f => f.id === fileId);
      console.log('Verification - File found in storage:', !!savedFile);
      if (savedFile) {
        console.log('Verification - Saved file details:', {
          id: savedFile.id,
          orderId: savedFile.orderId,
          filename: savedFile.filename,
          contentSize: savedFile.contentSize,
          hasContent: !!savedFile.content,
          contentType: typeof savedFile.content,
          contentLength: savedFile.content ? savedFile.content.length : 0,
          encoding: savedFile.encoding,
          allKeys: Object.keys(savedFile)
        });
      }
    }
    
    return res.status(200).json({ 
      success: true,
      message: "ファイルを受け付けました",
      fileId: fileId,
      uploadDate: timestamp,
      filename: fileRecord.filename,
      orderId: fileRecord.orderId,
      size: fileRecord.size,
      debug: {
        contentSize: fileRecord.contentSize,
        storageLength: global.fileStorage ? global.fileStorage.length : 0
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "ファイルアップロード中にエラーが発生しました",
      details: error.message
    });
  }
}

// Configure to parse JSON body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase limit for base64 encoded files
    },
  },
}