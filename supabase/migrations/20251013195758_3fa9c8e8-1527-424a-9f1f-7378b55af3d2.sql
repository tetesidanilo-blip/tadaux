-- Add status column to surveys table
ALTER TABLE public.surveys 
ADD COLUMN status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

-- Add index for better performance on status queries
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_user_status ON public.surveys(user_id, status);

-- Add comment for documentation
COMMENT ON COLUMN public.surveys.status IS 'Survey status: draft (auto-saved) or published (user confirmed)';