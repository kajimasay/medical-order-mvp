-- Medical Order System Database Schema
-- PostgreSQL tables for Vercel Postgres

-- Orders table (発注テーブル)
CREATE TABLE IF NOT EXISTS orders (
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
);

-- Files table (ファイルテーブル)
CREATE TABLE IF NOT EXISTS order_files (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    blob_url TEXT NOT NULL,
    file_size BIGINT,
    content_type VARCHAR(100) DEFAULT 'application/pdf',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email notifications table (メール通知履歴)
CREATE TABLE IF NOT EXISTS email_notifications (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- 'admin' or 'customer'
    subject VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(contact_email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_files_order_id ON order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON email_notifications(order_id);

-- Update trigger for orders.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();