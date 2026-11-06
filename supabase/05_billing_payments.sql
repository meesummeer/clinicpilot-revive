-- Add payments JSONB column to billings table
-- Stores an array of { mode, amount } objects for multi-payment support
-- payment_mode and paid_amount remain for backward compatibility and display
ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS payments jsonb;
