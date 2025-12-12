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
  
  // Return default mock data
  return [
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