import fs from 'fs';
import path from 'path';

// File data persistence
const DATA_DIR = '/tmp/cvg-data';
const FILES_DATA_FILE = path.join(DATA_DIR, 'files.json');
const FILES_STORAGE_DIR = path.join(DATA_DIR, 'uploads');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FILES_STORAGE_DIR)) {
    fs.mkdirSync(FILES_STORAGE_DIR, { recursive: true });
  }
}

// Load files data from persistent storage
function loadFiles() {
  ensureDirectories();
  try {
    if (fs.existsSync(FILES_DATA_FILE)) {
      const data = fs.readFileSync(FILES_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading files data:', error);
  }
  
  // Return default mock data and create physical files
  const mockData = [
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
  
  // Create physical mock files if they don't exist
  mockData.forEach(file => {
    const filePath = path.join(FILES_STORAGE_DIR, file.filename);
    if (!fs.existsSync(filePath)) {
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
/Length 120
>>
stream
BT
/F1 16 Tf
50 700 Td
(${file.originalName}) Tj
0 -30 Td
(注文ID: ${file.orderId}) Tj
0 -30 Td
(※ これはデモ用の医師免許証ファイルです) Tj
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
350
%%EOF`);
      
      try {
        fs.writeFileSync(filePath, mockPdfContent);
        console.log("Created mock file:", filePath);
      } catch (error) {
        console.error("Error creating mock file:", error);
      }
    }
  });
  
  return mockData;
}

// Save files data to persistent storage
function saveFiles(files) {
  ensureDirectories();
  try {
    fs.writeFileSync(FILES_DATA_FILE, JSON.stringify(files, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving files data:', error);
    return false;
  }
}

// Load files at startup
let uploadedFiles = loadFiles();

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
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = originalName ? path.extname(originalName) : '.pdf';
      const storedFilename = `file_${timestamp}_${orderId}${fileExtension}`;
      
      const newFile = {
        id: `file_${timestamp}`,
        orderId: parseInt(orderId) || 0,
        filename: storedFilename,
        originalName: originalName || filename,
        uploadDate: new Date().toISOString(),
        size: size || 'Unknown',
        type: type || 'application/pdf'
      };
      
      // Create physical demo file
      try {
        ensureDirectories();
        const filePath = path.join(FILES_STORAGE_DIR, storedFilename);
        
        // Create demo PDF content
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
/Length 120
>>
stream
BT
/F1 16 Tf
50 700 Td
(医師免許証 - ${originalName || 'Demo File'}) Tj
0 -30 Td
(注文ID: ${orderId}) Tj
0 -30 Td
(作成日時: ${new Date().toLocaleString('ja-JP')}) Tj
0 -30 Td
(※ これはデモ用のファイルです) Tj
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
400
%%EOF`);

        fs.writeFileSync(filePath, mockPdfContent);
        console.log("Physical file created:", filePath);
      } catch (fileError) {
        console.error("Error creating physical file:", fileError);
      }
      
      uploadedFiles.unshift(newFile);
      
      // Save to persistent storage
      const saved = saveFiles(uploadedFiles);
      console.log("File record added:", newFile);
      console.log("Files data saved to disk:", saved);
      
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