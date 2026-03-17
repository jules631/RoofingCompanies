-- RoofPing Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  twilio_number TEXT NOT NULL,
  rep_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- leads table
CREATE TYPE lead_stage AS ENUM (
  'new',
  'acknowledged',
  'nurturing',
  'rep_alerted',
  'contacted',
  'closed'
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  damage_description TEXT NOT NULL,
  stage lead_stage NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sequences table
CREATE TYPE sequence_status AS ENUM (
  'active',
  'paused',
  'completed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  status sequence_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- messages table
CREATE TYPE message_channel AS ENUM ('sms');

CREATE TYPE message_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  channel message_channel NOT NULL DEFAULT 'sms',
  body TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status message_status NOT NULL DEFAULT 'pending',
  job_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- events table
CREATE TYPE event_type AS ENUM (
  'acknowledged',
  'rep_contacted',
  'lead_replied',
  'sequence_stopped',
  'escalation_sent',
  'follow_up_sent'
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id),
  type event_type NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_sequences_lead_id ON sequences(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_events_lead_id ON events(lead_id);

-- Insert a default company (update with your real values)
-- INSERT INTO companies (name, twilio_number, rep_phone)
-- VALUES ('Your Roofing Co', '+15551234567', '+15559876543');
