-- CPMAI Flashcard App - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Device progress table (stores per-device learning progress)
CREATE TABLE IF NOT EXISTS device_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  correct_streak INTEGER DEFAULT 0,
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  interval_days REAL DEFAULT 0,
  next_due TIMESTAMP WITH TIME ZONE,
  last_shown TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, card_id)
);

-- Session history table
CREATE TABLE IF NOT EXISTS session_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cards_shown INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  cards_incorrect INTEGER DEFAULT 0,
  cards_skipped INTEGER DEFAULT 0
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_device_progress_device_id ON device_progress(device_id);
CREATE INDEX IF NOT EXISTS idx_session_history_device_id ON session_history(device_id);

-- Enable Row Level Security (RLS)
ALTER TABLE device_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access (no auth required)
-- Anyone can read/write their own device data
CREATE POLICY "Allow all access to device_progress" ON device_progress
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to session_history" ON session_history
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_device_progress_updated_at
  BEFORE UPDATE ON device_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
