CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID REFERENCES boxeo_videos(id) ON DELETE CASCADE,
  visto_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, video_id)
);

ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_progress_select_own" ON video_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "video_progress_insert_own" ON video_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_progress_delete_own" ON video_progress FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_video_progress_user ON video_progress(user_id);
CREATE INDEX idx_video_progress_video ON video_progress(video_id);
