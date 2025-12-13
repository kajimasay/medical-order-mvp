// シンプルなファイルアップロード実装
export default async function handler(req, res) {
  console.log('=== SIMPLE UPLOAD API ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request handled');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("File upload request received");
    
    // Generate dummy file info for now
    const fileId = `file_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    console.log("Generated file ID:", fileId);
    
    return res.status(200).json({ 
      success: true,
      message: "ファイルを受け付けました",
      fileId: fileId,
      uploadDate: timestamp,
      note: "シンプルテスト版です"
    });

  } catch (error) {
    console.error("Simple upload error:", error);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "ファイルアップロード中にエラーが発生しました",
      details: error.message
    });
  }
}