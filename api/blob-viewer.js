// Vercel Blob viewer for metadata and files
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  console.log('=== BLOB VIEWER API ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  
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

    const { type, fileId, prefix } = req.query;

    if (type === 'list') {
      // List all blobs with optional prefix
      console.log('Listing blobs with prefix:', prefix || 'all');
      
      const blobs = await list({ prefix: prefix || '' });
      
      return res.status(200).json({
        success: true,
        blobs: blobs.blobs.map(blob => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt
        }))
      });
    }

    if (type === 'metadata' && fileId) {
      // Get specific metadata file
      console.log('Fetching metadata for fileId:', fileId);
      
      const metadataBlobs = await list({ prefix: `metadata/${fileId}` });
      
      if (metadataBlobs.blobs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Metadata not found',
          fileId
        });
      }

      // Fetch the metadata content
      const metadataUrl = metadataBlobs.blobs[0].url;
      console.log('Fetching metadata from URL:', metadataUrl);
      
      const response = await fetch(metadataUrl);
      
      if (!response.ok) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch metadata',
          status: response.status
        });
      }

      const metadata = await response.json();
      
      return res.status(200).json({
        success: true,
        metadata: metadata,
        blobInfo: {
          url: metadataUrl,
          pathname: metadataBlobs.blobs[0].pathname,
          size: metadataBlobs.blobs[0].size,
          uploadedAt: metadataBlobs.blobs[0].uploadedAt
        }
      });
    }

    if (type === 'file' && fileId) {
      // Get file info (not content, just metadata)
      console.log('Fetching file info for fileId:', fileId);
      
      const fileBlobs = await list({ prefix: `files/${fileId}` });
      
      if (fileBlobs.blobs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          fileId
        });
      }

      return res.status(200).json({
        success: true,
        fileInfo: {
          url: fileBlobs.blobs[0].url,
          pathname: fileBlobs.blobs[0].pathname,
          size: fileBlobs.blobs[0].size,
          uploadedAt: fileBlobs.blobs[0].uploadedAt
        }
      });
    }

    // Default: List all metadata files
    console.log('Listing all metadata files');
    
    const metadataBlobs = await list({ prefix: 'metadata/' });
    
    return res.status(200).json({
      success: true,
      message: 'Metadata files list',
      files: metadataBlobs.blobs.map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
        fileId: blob.pathname.replace('metadata/', '').replace('.json', '')
      }))
    });

  } catch (error) {
    console.error('Blob viewer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Blob viewer中にエラーが発生しました',
      details: error.message
    });
  }
}