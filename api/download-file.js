// File download endpoint - memory-based version
// Import files data from files.js (shared memory)

// Global file storage (shared across instances within same deployment)
global.globalFilesStorage = global.globalFilesStorage || null;

// Initialize shared files (same as files.js)
function initializeSharedFiles() {
  if (global.globalFilesStorage === null || global.globalFilesStorage === undefined) {
    global.globalFilesStorage = [
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
    console.log('Files storage initialized in download-file.js');
  }
  return global.globalFilesStorage;
}

// Add file to global storage
function addFileToGlobal(file) {
  const files = initializeSharedFiles();
  // Check if file already exists
  const existingIndex = files.findIndex(f => f.id === file.id);
  if (existingIndex === -1) {
    files.unshift(file);
    console.log('Added file to global storage:', file.id);
  } else {
    console.log('File already exists in global storage:', file.id);
  }
  return files;
}

// Generate medical license PDF content with proper Japanese content
function generateDemoPDF(originalName, orderId) {
  const fileName = originalName || 'Demo File';
  const orderIdStr = orderId ? orderId.toString() : '0000';
  const currentDate = new Date().toLocaleDateString('ja-JP');
  
  // Extract doctor name from filename
  let doctorName = 'Tanaka Taro';
  if (fileName.includes('田中太郎')) {
    doctorName = 'Tanaka Taro';
  } else if (fileName.includes('佐藤花子')) {
    doctorName = 'Sato Hanako';  
  } else if (fileName.includes('田中')) {
    doctorName = 'Tanaka';
  } else if (fileName.includes('佐藤')) {
    doctorName = 'Sato';
  }
  
  // Generate license number
  const licenseNumber = `第${String(Math.floor(Math.random() * 900000) + 100000)}号`;
  const issueDate = new Date(Date.now() - Math.floor(Math.random() * 365 * 5) * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP');
  
  const contentStream = `BT /F1 16 Tf 200 720 Td (MEDICAL LICENSE) Tj /F1 14 Tf 220 700 Td (Ishimen-kyosho) Tj /F1 12 Tf 50 650 Td (License No: ${licenseNumber}) Tj 0 -25 Td (Doctor Name: ${doctorName}) Tj 0 -25 Td (Specialty: Internal Medicine) Tj 0 -25 Td (Issue Date: ${issueDate}) Tj 0 -25 Td (Valid Until: 2030/12/31) Tj 0 -40 Td (Issued by: Ministry of Health, Labour and Welfare) Tj 0 -25 Td (Japan Medical Association) Tj 0 -40 Td (Document Details:) Tj 0 -20 Td (Order ID: ${orderIdStr}) Tj 0 -20 Td (File: ${fileName}) Tj 0 -20 Td (Generated: ${currentDate}) Tj 0 -40 Td (This medical license certifies that the above) Tj 0 -20 Td (named person is qualified to practice medicine) Tj 0 -20 Td (in accordance with Japanese medical law.) Tj ET`;
  
  const streamLength = contentStream.length;
  
  const pdfContent = `%PDF-1.4
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
/Resources <<
  /Font <<
    /F1 <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica-Bold
    >>
  >>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${420 + streamLength}
%%EOF`;

  console.log('Generated medical license PDF content length:', pdfContent.length);
  return Buffer.from(pdfContent, 'utf8');
}

export default async function handler(req, res) {
  console.log('=== DOWNLOAD FILE API CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  console.log('Headers:', req.headers);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request handled');
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      console.log('Invalid method:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { fileId } = req.query;
    console.log('Requested fileId:', fileId);
    
    if (!fileId) {
      console.log('No fileId provided');
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    // Find file metadata
    const files = initializeSharedFiles();
    console.log('Total available files:', files.length);
    console.log('Available files:', files.map(f => ({ id: f.id, name: f.originalName })));
    console.log('Searching for fileId:', fileId);
    
    let fileRecord = files.find(f => f.id === fileId);
    console.log('Found file record:', fileRecord ? 'YES' : 'NO');
    
    // If not found, try to create a dynamic demo file
    if (!fileRecord && fileId.startsWith('file_')) {
      console.log('File not found, creating dynamic demo file');
      const timestamp = fileId.replace('file_', '');
      const orderId = Math.floor(Math.random() * 9000) + 1000; // Random order ID
      
      fileRecord = {
        id: fileId,
        orderId: orderId,
        filename: `demo_${timestamp}.pdf`,
        originalName: `デモ医師免許証_${timestamp}.pdf`,
        uploadDate: new Date().toISOString(),
        size: '1.5MB',
        type: 'application/pdf',
        content: generateDemoPDF(`Demo_${timestamp}.pdf`, orderId).toString('base64')
      };
      
      // Add to global storage for future requests
      addFileToGlobal(fileRecord);
      console.log('Created and added dynamic demo file:', fileRecord.id);
    }
    
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
      // File content stored in base64 (actual uploaded file)
      console.log('Using uploaded file content for:', fileRecord.originalName);
      fileContent = Buffer.from(fileRecord.content, 'base64');
    } else {
      // Generate demo PDF on the fly (for demo files without actual content)
      console.log('Generating demo PDF for:', fileRecord.originalName);
      fileContent = generateDemoPDF(fileRecord.originalName, fileRecord.orderId);
    }
    
    console.log('Serving file:', fileRecord.originalName, 'Size:', fileContent.length);
    
    // Properly encode Japanese filename for Content-Disposition header
    const encodedFileName = encodeURIComponent(fileRecord.originalName);
    console.log('Original filename:', fileRecord.originalName);
    console.log('Encoded filename:', encodedFileName);
    
    res.setHeader('Content-Type', fileRecord.type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`);
    res.setHeader('Content-Length', fileContent.length);
    
    return res.status(200).send(fileContent);

  } catch (error) {
    console.error('=== FILE DOWNLOAD ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'ファイルダウンロード中にエラーが発生しました',
      debug: {
        errorMessage: error.message,
        errorName: error.name,
        timestamp: new Date().toISOString()
      }
    });
  }
}