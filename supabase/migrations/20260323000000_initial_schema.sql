-- Proposals table
CREATE TABLE proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  url_content TEXT,
  prompt_used TEXT NOT NULL,
  generated_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Prompt templates table
CREATE TABLE prompt_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_proposals_created_at ON proposals (created_at DESC);
CREATE INDEX idx_prompt_templates_default ON prompt_templates (is_default) WHERE is_default = true;

-- Enable RLS (open access - no auth)
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on proposals" ON proposals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on prompt_templates" ON prompt_templates FOR ALL USING (true) WITH CHECK (true);

-- Seed default prompt template
INSERT INTO prompt_templates (name, content, is_default) VALUES (
  'Default Proposal',
  E'You are a professional proposal writer. Based on the following website content, generate a comprehensive business proposal.\n\nWebsite Content:\n{{URL_CONTENT}}\n\nPlease generate a well-structured proposal that includes:\n1. Executive Summary\n2. Understanding of the Client/Project\n3. Proposed Solution\n4. Scope of Work\n5. Timeline\n6. Investment/Pricing Considerations\n7. Why Choose Us\n8. Next Steps\n\nWrite in a professional, persuasive tone. Use markdown formatting.',
  true
);
