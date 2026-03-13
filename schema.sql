-- ============================================================
-- Supabase SQL Schema — To-Do App
-- Supabase Dashboard → SQL Editor 에서 실행하세요.
-- ============================================================

-- 1. tasks 테이블 생성
CREATE TABLE IF NOT EXISTS public.tasks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text       TEXT        NOT NULL,
  done       BOOLEAN     NOT NULL DEFAULT false,
  priority   TEXT        NOT NULL DEFAULT 'none'
               CHECK (priority IN ('high', 'medium', 'low', 'none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Row Level Security (RLS) 활성화
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4. 공개 접근 정책 (인증 없이 사용 — 개발/데모용)
--    실서비스에서는 auth.uid() 기반 정책으로 교체하세요.
CREATE POLICY "Allow all access" ON public.tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;

-- ============================================================
-- (선택) 인증 기반 정책 예시 — auth 도입 시 위 정책 대신 사용
-- ============================================================
-- ALTER TABLE public.tasks ADD COLUMN user_id UUID REFERENCES auth.users(id);
--
-- DROP POLICY "Allow all access" ON public.tasks;
--
-- CREATE POLICY "Users manage own tasks" ON public.tasks
--   FOR ALL
--   USING  (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
