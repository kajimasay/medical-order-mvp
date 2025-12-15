// PostgreSQL database utilities for Vercel Postgres
import { sql } from '@vercel/postgres';

// Initialize database tables if they don't exist
export async function initDatabase() {
  try {
    console.log('Checking database tables...');
    
    // Check if orders table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `;
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating database tables...');
      
      // Create orders table
      await sql`
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          full_name VARCHAR(255) NOT NULL,
          company_name VARCHAR(255),
          company_phone VARCHAR(50),
          company_address TEXT,
          home_address TEXT,
          home_phone VARCHAR(50),
          contact_name VARCHAR(255) NOT NULL,
          contact_phone VARCHAR(50) NOT NULL,
          contact_email VARCHAR(255) NOT NULL,
          product VARCHAR(100) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create order_files table
      await sql`
        CREATE TABLE order_files (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          filename VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          blob_url TEXT NOT NULL,
          file_size BIGINT,
          content_type VARCHAR(100) DEFAULT 'application/pdf',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create email_notifications table
      await sql`
        CREATE TABLE email_notifications (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          recipient_email VARCHAR(255) NOT NULL,
          email_type VARCHAR(50) NOT NULL,
          subject VARCHAR(500),
          status VARCHAR(50) DEFAULT 'pending',
          error_message TEXT,
          sent_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create indexes
      await sql`CREATE INDEX idx_orders_email ON orders(contact_email)`;
      await sql`CREATE INDEX idx_orders_created_at ON orders(created_at)`;
      await sql`CREATE INDEX idx_orders_status ON orders(status)`;
      await sql`CREATE INDEX idx_files_order_id ON order_files(order_id)`;
      await sql`CREATE INDEX idx_notifications_order_id ON email_notifications(order_id)`;

      console.log('Database tables created successfully');
    } else {
      console.log('Database tables already exist');
    }

    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

// Order operations
export async function createOrder(orderData) {
  try {
    console.log('Creating order in PostgreSQL:', orderData);
    
    const result = await sql`
      INSERT INTO orders (
        full_name, company_name, company_phone, company_address,
        home_address, home_phone, contact_name, contact_phone,
        contact_email, product, quantity, status
      ) VALUES (
        ${orderData.full_name}, ${orderData.company_name || ''}, 
        ${orderData.company_phone || ''}, ${orderData.company_address || ''},
        ${orderData.home_address || ''}, ${orderData.home_phone || ''},
        ${orderData.contact_name}, ${orderData.contact_phone},
        ${orderData.contact_email}, ${orderData.product}, ${orderData.quantity},
        ${orderData.status || 'pending'}
      ) RETURNING id, created_at
    `;

    console.log('Order created successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
}

export async function getAllOrders() {
  try {
    console.log('Fetching all orders from PostgreSQL');
    
    const result = await sql`
      SELECT * FROM orders 
      ORDER BY created_at DESC
    `;

    console.log(`Retrieved ${result.rows.length} orders from PostgreSQL`);
    return result.rows;
  } catch (error) {
    console.error('Get orders error:', error);
    throw error;
  }
}

export async function getOrderById(orderId) {
  try {
    console.log('Fetching order by ID from PostgreSQL:', orderId);
    
    const result = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId}
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Get order by ID error:', error);
    throw error;
  }
}

export async function updateOrderStatus(orderId, status) {
  try {
    console.log('Updating order status in PostgreSQL:', orderId, status);
    
    const result = await sql`
      UPDATE orders 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${orderId}
      RETURNING *
    `;

    return result.rows[0] || null;
  } catch (error) {
    console.error('Update order status error:', error);
    throw error;
  }
}

// File operations
export async function createOrderFile(fileData) {
  try {
    console.log('Creating order file record in PostgreSQL:', fileData);
    
    const result = await sql`
      INSERT INTO order_files (
        order_id, filename, original_name, blob_url, 
        file_size, content_type
      ) VALUES (
        ${fileData.order_id}, ${fileData.filename}, ${fileData.original_name},
        ${fileData.blob_url}, ${fileData.file_size || 0}, 
        ${fileData.content_type || 'application/pdf'}
      ) RETURNING id, created_at
    `;

    console.log('Order file created successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Create order file error:', error);
    throw error;
  }
}

export async function getOrderFiles(orderId) {
  try {
    console.log('Fetching order files from PostgreSQL:', orderId);
    
    const result = await sql`
      SELECT * FROM order_files 
      WHERE order_id = ${orderId}
      ORDER BY created_at DESC
    `;

    console.log(`Retrieved ${result.rows.length} files for order ${orderId}`);
    return result.rows;
  } catch (error) {
    console.error('Get order files error:', error);
    throw error;
  }
}

export async function getAllFiles() {
  try {
    console.log('Fetching all files from PostgreSQL');
    
    const result = await sql`
      SELECT 
        f.*,
        o.full_name as order_full_name,
        o.contact_email as order_email
      FROM order_files f
      LEFT JOIN orders o ON f.order_id = o.id
      ORDER BY f.created_at DESC
    `;

    console.log(`Retrieved ${result.rows.length} files from PostgreSQL`);
    return result.rows;
  } catch (error) {
    console.error('Get all files error:', error);
    throw error;
  }
}

// Email notification operations
export async function logEmailNotification(notificationData) {
  try {
    console.log('Logging email notification in PostgreSQL:', notificationData);
    
    const result = await sql`
      INSERT INTO email_notifications (
        order_id, recipient_email, email_type, subject, status, error_message, sent_at
      ) VALUES (
        ${notificationData.order_id}, ${notificationData.recipient_email},
        ${notificationData.email_type}, ${notificationData.subject || ''},
        ${notificationData.status || 'pending'}, ${notificationData.error_message || ''},
        ${notificationData.sent_at ? new Date(notificationData.sent_at) : null}
      ) RETURNING id
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Log email notification error:', error);
    throw error;
  }
}

// Database connection test
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW() as current_time`;
    console.log('PostgreSQL connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    return false;
  }
}