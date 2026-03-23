export interface FetchUrlResponse {
  title: string;
  description: string;
  content: string;
}

export interface Proposal {
  id: string;
  url: string;
  url_content: string | null;
  prompt_used: string;
  generated_content: string;
  created_at: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
}
