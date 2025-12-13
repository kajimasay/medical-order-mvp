// Simple files API with shared memory storage
import { getGlobalFiles, addGlobalFile } from '../lib/shared-storage.js';

export default async function handler(req, res) {
  console.log('=== SIMPLE FILES API ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request handled');
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      const { orderId, fileId } = req.query;
      
      console.log('=== FILES GET REQUEST ===');
      console.log('Requested orderId:', orderId, 'fileId:', fileId);
      
      // If specific fileId requested, return that file with content
      if (fileId) {
        console.log('=== GLOBAL STORAGE DEBUG ===');
        console.log('Process PID:', process.pid);
        console.log('Global storage exists:', !!global.fileStorage);
        console.log('Global storage length:', global.fileStorage ? global.fileStorage.length : 0);
        if (global.fileStorage && global.fileStorage.length > 0) {
          console.log('Available file IDs in storage:', global.fileStorage.map(f => f.id));
        }
        
        const allFiles = getGlobalFiles();
        console.log('Retrieved files count:', allFiles.length);
        
        const specificFile = allFiles.find(f => f.id === fileId);
        console.log('Specific file search result:', !!specificFile);
        
        if (specificFile) {
          console.log('Found specific file:', specificFile.originalName);
          console.log('File details for API response:', {
            id: specificFile.id,
            orderId: specificFile.orderId,
            filename: specificFile.filename,
            hasContent: !!specificFile.content,
            contentType: typeof specificFile.content,
            contentLength: specificFile.content ? specificFile.content.length : 0,
            encoding: specificFile.encoding,
            allKeys: Object.keys(specificFile)
          });
          
          return res.status(200).json({
            success: true,
            file: specificFile
          });
        } else {
          return res.status(404).json({
            success: false,
            error: 'File not found',
            requestedId: fileId
          });
        }
      }
      
      const allFiles = getGlobalFiles();
      console.log('=== FILES API DEBUG INFO ===');
      console.log('Current process PID:', process.pid);
      console.log('Current timestamp:', Date.now());
      console.log('Global storage exists?:', !!global.fileStorage);
      console.log('Total files in shared storage:', allFiles.length);
      console.log('Raw global.fileStorage:', global.fileStorage ? JSON.stringify(global.fileStorage, null, 2) : 'undefined');
      console.log('=== ALL FILES DETAILED INFO ===');
      allFiles.forEach((f, index) => {
        console.log(`File ${index + 1}:`, {
          id: f.id,
          orderId: f.orderId,
          orderIdType: typeof f.orderId,
          originalName: f.originalName,
          uploadDate: f.uploadDate
        });
      });
      
      let files = [...allFiles];
      
      // Filter by order ID if specified
      if (orderId) {
        console.log('Filtering for orderId:', orderId, 'Type:', typeof orderId);
        files = files.filter(file => {
          const matches = file.orderId == orderId;
          console.log(`File ${file.id}: orderId=${file.orderId} (${typeof file.orderId}) == ${orderId} (${typeof orderId}) = ${matches}`);
          return matches;
        });
        console.log('Filtered files for order', orderId, ':', files.length);
      }
      
      console.log('=== RETURNING FILES ===');
      files.forEach((f, index) => {
        console.log(`Returning file ${index + 1}:`, {
          id: f.id,
          orderId: f.orderId,
          name: f.originalName
        });
      });
      
      return res.status(200).json({
        success: true,
        files: files,
        count: files.length
      });
    }

    if (req.method === 'POST') {
      const { orderId, filename, originalName, size, type, fileId } = req.body;
      
      console.log('=== FILES POST REQUEST ===');
      console.log('Adding file via POST:', { fileId, orderId, originalName });
      
      // Add file to storage through POST request (backup method)
      const fileRecord = {
        id: fileId,
        orderId: parseInt(orderId),
        filename: filename || originalName,
        originalName: originalName || filename,
        uploadDate: new Date().toISOString(),
        size: size || 'Unknown',
        type: type || 'application/pdf'
      };
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'fileId is required'
        });
      }
      
      addGlobalFile(fileRecord);
      console.log('File added via POST request:', JSON.stringify(fileRecord, null, 2));
      
      const allFiles = getGlobalFiles();
      console.log('Total files after POST:', allFiles.length);
      console.log('All files:', allFiles.map(f => ({ id: f.id, orderId: f.orderId, name: f.originalName })));
      
      return res.status(200).json({
        success: true,
        message: 'File added to storage',
        fileId: fileId,
        file: fileRecord
      });
      
      return res.status(200).json({
        success: true,
        message: 'File registered successfully',
        file: newFile,
        totalFiles: allFiles.length
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Simple files API error:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'ファイル処理中にエラーが発生しました',
      details: error.message
    });
  }
}