export function buildPitchSystemPrompt(clientName: string, industry: string): string {
  return `You are an experienced PR professional crafting personalized media pitches on behalf of ${clientName}, a company in the ${industry} industry.

Your writing style is:
- Warm and professional, never stiff or corporate
- Conversational but respectful of the journalist's time
- Concise and compelling — every sentence earns its place
- Tailored to the specific journalist and their beat

Guidelines:
- The pitch body should be 150-250 words
- Open with a hook relevant to the journalist's beat or recent coverage
- Clearly explain why this story matters to their audience
- Include a specific ask or next step
- Sign off naturally, not with generic corporate closings
- Never use buzzwords like "synergy", "leverage", "disrupt", or "game-changing"
- Do not include placeholder text — write the full pitch ready to send`;
}

export function buildPitchUserPrompt(
  brief: string,
  clientName: string,
  industry: string,
  contact: { name: string; publication: string; beat: string; tier: string }
): string {
  return `Write a media pitch email for the following campaign.

CLIENT: ${clientName}
INDUSTRY: ${industry}

CAMPAIGN BRIEF:
${brief}

JOURNALIST DETAILS:
- Name: ${contact.name}
- Publication: ${contact.publication}
- Beat: ${contact.beat}
- Tier: ${contact.tier}

Write a personalized pitch for this journalist. Tailor the angle to their beat and publication. If they are a Tier 1 journalist, make the pitch especially polished and offer an exclusive angle.

Output your response in EXACTLY this format:
SUBJECT: <subject line here>
BODY:
<full pitch body here>`;
}

export function buildContactSuggestionPrompt(
  brief: string,
  clientName: string,
  industry: string,
  contacts: { id: string; name: string; publication: string; beat: string; tier: string }[]
): string {
  const contactList = contacts
    .map((c) => `- ID: ${c.id} | ${c.name} | ${c.publication} | Beat: ${c.beat} | Tier: ${c.tier}`)
    .join("\n");

  return `You are a PR strategist selecting the best media contacts for a campaign.

CLIENT: ${clientName}
INDUSTRY: ${industry}

CAMPAIGN BRIEF:
${brief}

AVAILABLE CONTACTS:
${contactList}

Select the top 10 most relevant contacts for this campaign (or fewer if less than 10 are available). Consider:
- How well their beat aligns with the campaign topic
- The relevance of their publication to the client's industry
- A good mix of tier levels for maximum coverage

Return ONLY a JSON array with no additional text, in this exact format:
[{"contactId": "...", "reason": "..."}]

Each reason should be one concise sentence explaining why this contact is a good fit.`;
}

export function parsePitchResponse(text: string): { subject: string; body: string } {
  // Try to find SUBJECT: line
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : "";

  // Try to find BODY: marker and get everything after it
  const bodyMatch = text.match(/BODY:\s*\n?([\s\S]*)/i);
  let body = bodyMatch ? bodyMatch[1].trim() : "";

  // If we couldn't parse the format, try fallback approaches
  if (!subject && !body) {
    // Maybe the AI just wrote a pitch without labels
    // Use the first line as subject, rest as body
    const lines = text.trim().split("\n");
    if (lines.length > 1) {
      return {
        subject: lines[0].replace(/^(subject|re|subj):\s*/i, "").trim(),
        body: lines.slice(1).join("\n").trim(),
      };
    }
    return { subject: "", body: text.trim() };
  }

  // If we got a subject but no body marker, take everything after the subject line
  if (subject && !body) {
    const subjectEnd = text.indexOf(subject) + subject.length;
    body = text.slice(subjectEnd).trim();
  }

  return { subject, body };
}
