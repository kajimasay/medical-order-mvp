// File management endpoint - list and access uploaded files
let uploadedFiles = [
  // Mock data structure for demonstration
  {
    id: "file_1734057600000",
    orderId: 1001,
    filename: "license_tanaka.pdf", 
    originalName: "医師免許証_田中太郎.pdf",
    uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    size: "2.1MB",
    type: "application/pdf"
  },
  {
    id: "file_1734057700000", 
    orderId: 1002,
    filename: "license_sato.pdf",
    originalName: "医師免許証_佐藤花子.pdf", 
    uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    size: "1.8MB",
    type: "application/pdf"
  }
];

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method === 'GET') {
      // List all uploaded files
      const { orderId } = req.query;
      
      let files = [...uploadedFiles];
      
      // Filter by order ID if specified
      if (orderId) {
        files = files.filter(file => file.orderId == orderId);
      }
      
      return res.status(200).json({
        success: true,
        files: files,
        count: files.length
      });
    }

    if (req.method === 'POST') {
      // Add file record (called after successful upload)
      const { orderId, filename, originalName, size, type } = req.body;
      
      const newFile = {
        id: `file_${Date.now()}`,
        orderId: parseInt(orderId) || 0,
        filename: filename || 'unknown.file',
        originalName: originalName || filename,
        uploadDate: new Date().toISOString(),
        size: size || 'Unknown',
        type: type || 'application/octet-stream'
      };
      
      uploadedFiles.unshift(newFile);
      
      console.log("File record added:", newFile);
      
      return res.status(200).json({
        success: true,
        file: newFile,
        message: "ファイル情報を記録しました"
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error("File management error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error", 
      message: "ファイル管理中にエラーが発生しました"
    });
  }
}