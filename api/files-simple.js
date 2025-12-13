// Simple files API with memory storage
let memoryFiles = [
  {
    id: "file_demo_1001",
    orderId: 1001,
    filename: "license_demo1.pdf",
    originalName: "医師免許証_デモ1.pdf",
    uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    size: "2.1MB",
    type: "application/pdf"
  },
  {
    id: "file_demo_1002",
    orderId: 1002,
    filename: "license_demo2.pdf", 
    originalName: "医師免許証_デモ2.pdf",
    uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    size: "1.8MB",
    type: "application/pdf"
  }
];

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
      const { orderId } = req.query;
      
      console.log('=== FILES GET REQUEST ===');
      console.log('Requested orderId:', orderId);
      console.log('Total files in memory:', memoryFiles.length);
      
      let files = [...memoryFiles];
      
      // Filter by order ID if specified
      if (orderId) {
        files = files.filter(file => file.orderId == orderId);
        console.log('Filtered files for order', orderId, ':', files.length);
      }
      
      console.log('Returning files:', files.map(f => ({ id: f.id, name: f.originalName })));
      
      return res.status(200).json({
        success: true,
        files: files,
        count: files.length
      });
    }

    if (req.method === 'POST') {
      const { orderId, filename, originalName, size, type, fileId } = req.body;
      
      console.log('=== FILES POST REQUEST ===');
      console.log('Adding file:', { fileId, orderId, originalName });
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'fileId is required'
        });
      }
      
      // Check if file already exists
      const existingIndex = memoryFiles.findIndex(f => f.id === fileId);
      
      const newFile = {
        id: fileId,
        orderId: parseInt(orderId) || 0,
        filename: filename || `file_${Date.now()}.pdf`,
        originalName: originalName || filename,
        uploadDate: new Date().toISOString(),
        size: size || 'Unknown',
        type: type || 'application/pdf'
      };
      
      if (existingIndex === -1) {
        memoryFiles.unshift(newFile);
        console.log('File added to memory:', fileId);
      } else {
        memoryFiles[existingIndex] = newFile;
        console.log('File updated in memory:', fileId);
      }
      
      console.log('Total files now:', memoryFiles.length);
      
      return res.status(200).json({
        success: true,
        message: 'File registered successfully',
        file: newFile,
        totalFiles: memoryFiles.length
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