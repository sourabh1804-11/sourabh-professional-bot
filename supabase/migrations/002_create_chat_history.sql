-- Migration: Create Chat History Tables

-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL, -- Device fingerprint ID
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS chats_user_id_idx ON public.chats(user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index on chat_id for faster lookups when loading a chat
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON public.messages(chat_id);

-- Enable RLS (Row Level Security) but allow all operations for now since we rely on the server/API to protect routes
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create basic policies to allow service role full access
CREATE POLICY "Enable all access for service role on chats" ON public.chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
