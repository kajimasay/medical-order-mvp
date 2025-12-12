// File download endpoint
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/cvg-data';
const FILES_DATA_FILE = path.join(DATA_DIR, 'files.json');
const FILES_STORAGE_DIR = path.join(DATA_DIR, 'uploads');

// Load files data
function loadFiles() {
  try {
    if (fs.existsSync(FILES_DATA_FILE)) {
      const data = fs.readFileSync(FILES_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading files data:', error);
  }
  return [];
}

export default async function handler(req, res) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileId } = req.query;
    
    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    // Find file metadata
    const files = loadFiles();
    const fileRecord = files.find(f => f.id === fileId);
    
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // For demo purposes, return file metadata with mock download URL
    // In production, this would return the actual file content or a signed URL
    const filePath = path.join(FILES_STORAGE_DIR, fileRecord.filename);
    
    // Check if physical file exists (for demo, we'll simulate)
    const fileExists = fs.existsSync(filePath);
    
    if (!fileExists) {
      // For demo purposes, create a mock PDF response
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
(Demo File: ${fileRecord.originalName}) Tj
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

      res.setHeader('Content-Type', fileRecord.type || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
      res.setHeader('Content-Length', mockPdfContent.length);
      
      return res.status(200).send(mockPdfContent);
    }

    // If file exists, serve it
    const fileContent = fs.readFileSync(filePath);
    res.setHeader('Content-Type', fileRecord.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileRecord.originalName}"`);
    res.setHeader('Content-Length', fileContent.length);
    
    return res.status(200).send(fileContent);

  } catch (error) {
    console.error('File download error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'ファイルダウンロード中にエラーが発生しました'
    });
  }
}