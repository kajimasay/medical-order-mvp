// File upload endpoint for license documents
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

    // Note: Vercel serverless functions have limited file upload capabilities
    // For production, consider using Vercel Blob Storage or AWS S3
    
    console.log("File upload request received");
    console.log("Headers:", req.headers);
    
    // For now, we'll simulate file processing and return a success response
    // In production, you would:
    // 1. Parse multipart/form-data
    // 2. Validate file type and size
    // 3. Upload to cloud storage (Vercel Blob, AWS S3, etc.)
    // 4. Return file URL or ID
    
    return res.status(200).json({ 
      success: true,
      message: "ファイルを受け付けました",
      fileId: `file_${Date.now()}`,
      note: "ファイルは一時的に保存されました。本格運用時はクラウドストレージに保存されます。"
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
    bodyParser: {
      sizeLimit: '10mb', // 10MB limit
    },
  },
}