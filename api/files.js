// In-memory file storage for Vercel serverless functions
// Note: In production, use cloud storage (Vercel Blob, AWS S3, etc.)

// Use global storage to share across API functions
global.globalFilesStorage = global.globalFilesStorage || null;

// Generate simple but functional PDF content
function generateDemoPDF(originalName, orderId) {
  const fileName = (originalName || 'Demo File').replace(/[^\x20-\x7E]/g, '?'); // Replace non-ASCII
  const orderIdStr = orderId ? orderId.toString() : '0000';
  const currentDate = new Date().toISOString().slice(0, 19);
  
  // Create a properly formatted PDF with correct structure
  const content = `Medical License Document\\nFile: ${fileName}\\nOrder ID: ${orderIdStr}\\nDate: ${currentDate}\\nThis is a demo file for testing purposes.`;
  const contentStream = `BT /F1 12 Tf 50 750 Td (Medical License Document) Tj 0 -20 Td (File: ${fileName.slice(0, 50)}) Tj 0 -20 Td (Order ID: ${orderIdStr}) Tj 0 -20 Td (Date: ${currentDate}) Tj 0 -30 Td (This is a demo file) Tj 0 -20 Td (for testing purposes.) Tj ET`;
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
      /BaseFont /Helvetica
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

  console.log('Generated PDF content length:', pdfContent.length);
  return Buffer.from(pdfContent, 'utf8');
}

// Initialize files data
function initializeFiles() {
  if (global.globalFilesStorage === null) {
    global.globalFilesStorage = [
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
    
    // Add demo content to files
    global.globalFilesStorage.forEach(file => {
      if (!file.content) {
        try {
          const pdfBuffer = generateDemoPDF(file.originalName, file.orderId);
          file.content = pdfBuffer.toString('base64');
        } catch (error) {
          console.error('Error generating PDF for file:', file.id, error);
          // Use fallback content
          file.content = Buffer.from('PDF generation failed').toString('base64');
        }
      }
    });
    
    console.log('Files initialized with', global.globalFilesStorage.length, 'items');
  }
  return global.globalFilesStorage;
}

// Get current files
function getFiles() {
  return initializeFiles();
}

// Add new file
function addFile(file) {
  const files = getFiles();
  files.unshift(file);
  console.log('File added, total files:', files.length);
  console.log('Added file with ID:', file.id);
  return files;
}

// Initialize files at module load
let uploadedFiles = getFiles();

export default async function handler(req, res) {
  console.log('=== FILES API CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      console.log('FILES: OPTIONS request handled');
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
      const fileExtension = originalName ? originalName.split('.').pop() : 'pdf';
      const storedFilename = `file_${timestamp}_${orderId}.${fileExtension}`;
      
      const newFile = {
        id: `file_${timestamp}`,
        orderId: parseInt(orderId) || 0,
        filename: storedFilename,
        originalName: originalName || filename,
        uploadDate: new Date().toISOString(),
        size: size || 'Unknown',
        type: type || 'application/pdf'
      };
      
      // Store file content in memory (demo PDF)
      const fileContent = generateDemoPDF(originalName, orderId);
      newFile.content = fileContent.toString('base64'); // Store as base64
      
      uploadedFiles = addFile(newFile);
      console.log("File record added:", newFile.id);
      
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