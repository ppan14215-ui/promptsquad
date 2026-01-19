-- =============================================
-- MASCOT LIKES TABLE
-- Tracks user likes for mascots (shared like system)
-- =============================================
CREATE TABLE public.mascot_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mascot_id UUID NOT NULL REFERENCES public.mascots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mascot_id) -- Prevent duplicate likes from same user
);

-- Indexes for performance
CREATE INDEX idx_mascot_likes_user_id ON public.mascot_likes(user_id);
CREATE INDEX idx_mascot_likes_mascot_id ON public.mascot_likes(mascot_id);
CREATE INDEX idx_mascot_likes_created_at ON public.mascot_likes(created_at DESC);

-- Enable RLS
ALTER TABLE public.mascot_likes ENABLE ROW LEVEL SECURITY;

-- Users can view all likes (for counts)
CREATE POLICY "Anyone can view mascot likes" 
  ON public.mascot_likes FOR SELECT 
  USING (true);

-- Users can only insert their own likes
CREATE POLICY "Users can insert own likes" 
  ON public.mascot_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own likes
CREATE POLICY "Users can delete own likes" 
  ON public.mascot_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to get like count for a mascot
CREATE OR REPLACE FUNCTION public.get_mascot_like_count(mascot_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.mascot_likes
    WHERE mascot_id = mascot_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked a mascot
CREATE OR REPLACE FUNCTION public.has_user_liked_mascot(mascot_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.mascot_likes
    WHERE mascot_id = mascot_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
