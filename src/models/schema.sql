-- Create Database (run this first if database doesn't exist)
-- CREATE DATABASE banking_db;

-- Connect to the database
-- \c banking_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    account_balance DECIMAL(15, 2) DEFAULT 0.00 CHECK (account_balance >= 0),
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    description TEXT,
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create transfers table (for tracking transfer relationships)
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    sender_transaction_id UUID REFERENCES transactions(id),
    receiver_transaction_id UUID REFERENCES transactions(id),
    transfer_reference VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_accounts CHECK (sender_id != receiver_id)
);

-- Create indexes for better performance
CREATE INDEX idx_customers_account_number ON customers(account_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_number);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transfers_sender ON transfers(sender_id);
CREATE INDEX idx_transfers_receiver ON transfers(receiver_id);
CREATE INDEX idx_transfers_reference ON transfers(transfer_reference);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for customers table
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample customers for testing
INSERT INTO customers (account_number, first_name, last_name, email, phone, account_balance)
VALUES
    ('ACC10000000001', 'John', 'Doe', 'john.doe@example.com', '+254700000001', 10000.00),
    ('ACC10000000002', 'Jane', 'Smith', 'jane.smith@example.com', '+254700000002', 5000.00),
    ('ACC10000000003', 'Bob', 'Johnson', 'bob.johnson@example.com', '+254700000003', 15000.00)
ON CONFLICT (account_number) DO NOTHING;

-- Create a view for customer transaction summary
CREATE OR REPLACE VIEW customer_transaction_summary AS
SELECT
    c.id,
    c.account_number,
    c.first_name,
    c.last_name,
    c.email,
    c.account_balance,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('deposit', 'transfer_in') THEN t.amount ELSE 0 END), 0) as total_credits,
    COALESCE(SUM(CASE WHEN t.transaction_type IN ('withdrawal', 'transfer_out') THEN t.amount ELSE 0 END), 0) as total_debits
FROM customers c
LEFT JOIN transactions t ON c.id = t.customer_id
GROUP BY c.id, c.account_number, c.first_name, c.last_name, c.email, c.account_balance;