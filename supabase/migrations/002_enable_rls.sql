-- =============================================
-- ENABLE RLS INCREMENTALLY
-- Start with basic policies for mascots table
-- =============================================

-- =============================================
-- 1. ENABLE RLS ON MASCOTS TABLE
-- =============================================
ALTER TABLE public.mascots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Mascots are viewable by everyone" ON public.mascots;
DROP POLICY IF EXISTS "Admins can manage mascots" ON public.mascots;

-- Policy: All authenticated users can view active mascots
CREATE POLICY "Mascots are viewable by authenticated users" 
  ON public.mascots FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can do everything with mascots
CREATE POLICY "Admins can manage mascots" 
  ON public.mascots FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 2. ENABLE RLS ON MASCOT_SKILLS TABLE
-- =============================================
ALTER TABLE public.mascot_skills ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read mascot skills" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins can manage mascot skills" ON public.mascot_skills;
DROP POLICY IF EXISTS "Admins can read all mascot skills" ON public.mascot_skills;

-- Policy: All authenticated users can view active skills
CREATE POLICY "Anyone can read mascot skills" 
  ON public.mascot_skills FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Policy: Admins can do everything with skills
CREATE POLICY "Admins can manage mascot skills" 
  ON public.mascot_skills FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can also read inactive skills
CREATE POLICY "Admins can read all mascot skills" 
  ON public.mascot_skills FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 3. ENABLE RLS ON MASCOT_INSTRUCTIONS TABLE
-- =============================================
ALTER TABLE public.mascot_instructions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read mascot instructions" ON public.mascot_instructions;
DROP POLICY IF EXISTS "Admins can manage mascot instructions" ON public.mascot_instructions;

-- Policy: All authenticated users can view instructions
CREATE POLICY "Anyone can read mascot instructions" 
  ON public.mascot_instructions FOR SELECT 
  TO authenticated
  USING (true);

-- Policy: Only admins can modify instructions
CREATE POLICY "Admins can manage mascot instructions" 
  ON public.mascot_instructions FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 4. ENABLE RLS ON MASCOT_LIKES TABLE
-- =============================================
ALTER TABLE public.mascot_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view mascot likes" ON public.mascot_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON public.mascot_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON public.mascot_likes;

-- Policy: All authenticated users can view all likes (for counts)
CREATE POLICY "Anyone can view mascot likes" 
  ON public.mascot_likes FOR SELECT 
  TO authenticated
  USING (true);

-- Policy: Users can only insert their own likes
CREATE POLICY "Users can insert own likes" 
  ON public.mascot_likes FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own likes
CREATE POLICY "Users can delete own likes" 
  ON public.mascot_likes FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- 5. ENABLE RLS ON PROFILES TABLE
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 6. ENABLE RLS ON USER_MASCOTS TABLE
-- =============================================
ALTER TABLE public.user_mascots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own mascots" ON public.user_mascots;
DROP POLICY IF EXISTS "Users can insert own mascots" ON public.user_mascots;
DROP POLICY IF EXISTS "Users can update own mascots" ON public.user_mascots;

-- Policy: Users can view their own mascots
CREATE POLICY "Users can view own mascots" 
  ON public.user_mascots FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own mascots
CREATE POLICY "Users can insert own mascots" 
  ON public.user_mascots FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own mascots
CREATE POLICY "Users can update own mascots" 
  ON public.user_mascots FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 7. ENABLE RLS ON CONVERSATIONS TABLE
-- =============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;

-- Policy: Users can view their own conversations
CREATE POLICY "Users can view own conversations" 
  ON public.conversations FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" 
  ON public.conversations FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own conversations
CREATE POLICY "Users can update own conversations" 
  ON public.conversations FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own conversations
CREATE POLICY "Users can delete own conversations" 
  ON public.conversations FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- 8. ENABLE RLS ON MESSAGES TABLE
-- =============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON public.messages;

-- Policy: Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations" 
  ON public.messages FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Policy: Users can insert messages in their conversations
CREATE POLICY "Users can insert messages in own conversations" 
  ON public.messages FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = messages.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );
