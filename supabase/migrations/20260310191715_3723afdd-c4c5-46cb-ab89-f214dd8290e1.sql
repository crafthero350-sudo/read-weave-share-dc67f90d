-- Fix media bucket upload policy: restrict uploads to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;

CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix books table: add created_by column for ownership tracking
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop old overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;

-- Users can only insert books they own
CREATE POLICY "Users can insert own books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creators can delete their own books
CREATE POLICY "Creators can delete own books"
  ON public.books FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);