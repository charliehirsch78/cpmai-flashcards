-- CPMAI Flashcard App - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Device progress table (stores per-device learning progress)
CREATE TABLE IF NOT EXISTS device_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  UNIQUE(device_id, card_id),
  UNIQUE(user_id, card_id)
);

-- Session history table
CREATE TABLE IF NOT EXISTS session_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  cards_shown INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  cards_incorrect INTEGER DEFAULT 0,
  cards_skipped INTEGER DEFAULT 0
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_device_progress_device_id ON device_progress(device_id);
CREATE INDEX IF NOT EXISTS idx_device_progress_user_id ON device_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_device_id ON session_history(device_id);
CREATE INDEX IF NOT EXISTS idx_session_history_user_id ON session_history(user_id);

-- Migration: Add user_id columns and drop NOT NULL on device_id
ALTER TABLE device_progress ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE session_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop NOT NULL on device_id so authenticated rows can have null device_id
ALTER TABLE device_progress ALTER COLUMN device_id DROP NOT NULL;
ALTER TABLE session_history ALTER COLUMN device_id DROP NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE device_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_progress
-- Allow authenticated users to access their own user_id data
CREATE POLICY "Users can view their own progress" ON device_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON device_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON device_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON device_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous/unauthenticated access via device_id (when user_id is NULL)
CREATE POLICY "Anonymous users can access device_id progress" ON device_progress
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- RLS Policies for session_history
-- Allow authenticated users to access their own user_id data
CREATE POLICY "Users can view their own sessions" ON session_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON session_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON session_history
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON session_history
  FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous/unauthenticated access via device_id (when user_id is NULL)
CREATE POLICY "Anonymous users can access device_id sessions" ON session_history
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

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
