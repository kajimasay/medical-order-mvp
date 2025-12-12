// File download endpoint - memory-based version
// Import files data from files.js (shared memory)

// This is a simple approach - in production, use shared database
let sharedFilesStorage = null;

// Initialize shared files (same as files.js)
function initializeSharedFiles() {
  if (sharedFilesStorage === null) {
    sharedFilesStorage = [
      {
        id: "file_1734057600000",
        orderId: 1001,
        filename: "license_tanaka.pdf", 
        originalName: "医師免許証_田中太郎.pdf",
        uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        size: "2.1MB",
        type: "application/pdf",
        content: generateDemoPDF("医師免許証_田中太郎.pdf", 1001).toString('base64')
      },
      {
        id: "file_1734057700000", 
        orderId: 1002,
        filename: "license_sato.pdf",
        originalName: "医師免許証_佐藤花子.pdf", 
        uploadDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        size: "1.8MB",
        type: "application/pdf",
        content: generateDemoPDF("医師免許証_佐藤花子.pdf", 1002).toString('base64')
      }
    ];
  }
  return sharedFilesStorage;
}

// Generate demo PDF content
function generateDemoPDF(originalName, orderId) {
  return Buffer.from(`%PDF-1.4
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
350
%%EOF`);
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
    const files = initializeSharedFiles();
    console.log('Available files:', files.map(f => ({ id: f.id, name: f.originalName })));
    console.log('Searching for fileId:', fileId);
    
    const fileRecord = files.find(f => f.id === fileId);
    console.log('Found file record:', fileRecord ? 'YES' : 'NO');
    
    if (!fileRecord) {
      console.log('File not found in records. Available file IDs:', files.map(f => f.id));
      return res.status(404).json({
        success: false,
        error: 'File not found',
        availableFiles: files.map(f => ({ id: f.id, name: f.originalName })),
        searchedId: fileId
      });
    }

    // Return file content from memory
    let fileContent;
    
    if (fileRecord.content) {
      // File content stored in base64
      fileContent = Buffer.from(fileRecord.content, 'base64');
    } else {
      // Generate demo PDF on the fly
      fileContent = generateDemoPDF(fileRecord.originalName, fileRecord.orderId);
    }
    
    console.log('Serving file:', fileRecord.originalName, 'Size:', fileContent.length);
    
    res.setHeader('Content-Type', fileRecord.type || 'application/pdf');
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