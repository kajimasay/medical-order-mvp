// File upload endpoint for license documents
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/cvg-data';
const FILES_STORAGE_DIR = path.join(DATA_DIR, 'uploads');

// Ensure upload directory exists
function ensureUploadDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILES_STORAGE_DIR)) {
    fs.mkdirSync(FILES_STORAGE_DIR, { recursive: true });
  }
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
    
    // Ensure upload directory exists
    ensureUploadDir();
    
    // For demo purposes, create a mock file and return success
    // In production, you would use multipart/form-data parsing
    const fileId = `file_${Date.now()}`;
    const mockFileName = `license_${Date.now()}.pdf`;
    const filePath = path.join(FILES_STORAGE_DIR, mockFileName);
    
    // Create a mock PDF file for demo
    const mockPdfContent = Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Demo License Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000201 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
294
%%EOF`);

    // Save mock file
    fs.writeFileSync(filePath, mockPdfContent);
    
    console.log("Mock file saved:", filePath);
    
    return res.status(200).json({ 
      success: true,
      message: "ファイルを受け付けました",
      fileId: fileId,
      filename: mockFileName,
      note: "デモ用のファイルが保存されました。本格運用時はクラウドストレージに保存されます。"
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