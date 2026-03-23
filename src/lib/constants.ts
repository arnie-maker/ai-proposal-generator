export const MODEL_ID = "anthropic/claude-opus-4-6";

export const DEFAULT_PROMPT_TEMPLATE = `You are a professional proposal writer. Based on the following website content, generate a comprehensive business proposal.

Website Content:
{{URL_CONTENT}}

Please generate a well-structured proposal that includes:
1. Executive Summary
2. Understanding of the Client/Project
3. Proposed Solution
4. Scope of Work
5. Timeline
6. Investment/Pricing Considerations
7. Why Choose Us
8. Next Steps

Write in a professional, persuasive tone. Use markdown formatting.

{{LANGUAGE_INSTRUCTION}}`;
