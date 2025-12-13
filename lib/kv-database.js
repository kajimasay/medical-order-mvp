// Vercel Blob Database utilities
import { put, head, list } from '@vercel/blob';

// File keys for JSON data storage
const ORDERS_FILE = 'orders.json';
const FILES_FILE = 'files.json';

// Helper function to fetch JSON from Blob
async function fetchJsonFromBlob(filename) {
  try {
    const blobs = await list({ prefix: filename });
    if (blobs.blobs.length > 0) {
      const response = await fetch(blobs.blobs[0].url);
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error);
    return null;
  }
}

// Helper function to save JSON to Blob
async function saveJsonToBlob(filename, data) {
  try {
    const blob = await put(filename, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json'
    });
    console.log(`${filename} saved to Blob:`, blob.url);
    return blob;
  } catch (error) {
    console.error(`Error saving ${filename} to Blob:`, error);
    throw error;
  }
}

// Order operations
export async function saveOrder(orderData) {
  try {
    // Get current orders
    const orders = await getOrders();
    
    // Generate new order ID (find max ID and increment)
    const maxId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) : 1002;
    const nextId = maxId + 1;
    
    const newOrder = {
      ...orderData,
      id: nextId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'pending'
    };
    
    // Add to orders array
    orders.unshift(newOrder);
    
    // Save back to Blob
    await saveJsonToBlob(ORDERS_FILE, orders);
    
    console.log('Order saved to Blob:', newOrder.id);
    return newOrder;
  } catch (error) {
    console.error('Error saving order to Blob:', error);
    throw error;
  }
}

export async function getOrders() {
  try {
    const orders = await fetchJsonFromBlob(ORDERS_FILE);
    
    if (orders && Array.isArray(orders)) {
      return orders;
    }
    
    // Return demo data if no orders exist yet
    const demoOrders = [
      {
        id: 1001,
        product: "eye-booster",
        quantity: 2,
        full_name: "田中 太郎",
        company_name: "田中眼科クリニック",
        contact_name: "田中 太郎",
        contact_phone: "03-1234-5678",
        contact_email: "tanaka@example.com",
        status: "pending",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 1002,
        product: "exosome-kit",
        quantity: 1,
        full_name: "佐藤 花子",
        company_name: "佐藤総合病院",
        contact_name: "佐藤 花子",
        contact_phone: "03-2345-6789",
        contact_email: "sato@hospital.com",
        status: "processing",
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    // Save demo data to initialize the blob
    await saveJsonToBlob(ORDERS_FILE, demoOrders);
    return demoOrders;
  } catch (error) {
    console.error('Error getting orders from Blob:', error);
    return [];
  }
}

export async function updateOrder(orderId, updateData) {
  try {
    const orders = await getOrders();
    
    // Find and update the order
    const orderIndex = orders.findIndex(order => order.id == orderId);
    
    if (orderIndex === -1) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    // Update the order
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    // Save back to Blob
    await saveJsonToBlob(ORDERS_FILE, orders);
    
    console.log('Order updated in Blob:', orderId);
    return orders[orderIndex];
  } catch (error) {
    console.error('Error updating order in Blob:', error);
    throw error;
  }
}

// File operations  
export async function saveFile(fileData) {
  try {
    const files = await getFiles();
    
    // Add to files array
    files.unshift(fileData);
    
    // Save back to Blob
    await saveJsonToBlob(FILES_FILE, files);
    
    console.log('File metadata saved to Blob:', fileData.id);
    return fileData;
  } catch (error) {
    console.error('Error saving file to Blob:', error);
    throw error;
  }
}

export async function getFiles() {
  try {
    const files = await fetchJsonFromBlob(FILES_FILE);
    
    if (files && Array.isArray(files)) {
      return files;
    }
    
    // Return demo data if no files exist yet
    const demoFiles = [
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
    
    // Save demo data to initialize the blob
    await saveJsonToBlob(FILES_FILE, demoFiles);
    return demoFiles;
  } catch (error) {
    console.error('Error getting files from Blob:', error);
    return [];
  }
}

export async function getFileById(fileId) {
  try {
    const files = await getFiles();
    return files.find(f => f.id === fileId) || null;
  } catch (error) {
    console.error('Error getting file by ID from Blob:', error);
    return null;
  }
}

// Save actual file content to Blob
export async function saveFileContent(fileId, content, filename) {
  try {
    const blob = await put(`files/${fileId}`, content, {
      access: 'public',
      contentType: 'application/pdf'
    });
    console.log('File content saved to Blob:', blob.url);
    return blob.url;
  } catch (error) {
    console.error('Error saving file content to Blob:', error);
    throw error;
  }
}