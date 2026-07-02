import type { AutoDetectedContext, AgentContextHint } from '@signet/shared';

/**
 * Builds a single comprehensive system prompt that instructs the LLM to
 * analyze the document from ALL angles simultaneously. The detected context
 * weights the emphasis, but every category is always checked.
 *
 * The LLM tags each finding with a `category` field so the UI can group them:
 *   - "consumer-protection" — hidden fees, auto-renewal, liability waivers
 *   - "contract-risk" — indemnification, IP, termination, governing law
 *   - "notary-compliance" — signature blocks, dates, witness requirements
 */
export function buildComprehensivePrompt(
  documentText: string,
  detectedContext: AutoDetectedContext,
  contextHint?: AgentContextHint,
): string {
  const emphasis = getEmphasisInstruction(detectedContext);
  const contextLine = buildContextLine(contextHint);

  return `You are a legal document analysis assistant. Analyze the following document text comprehensively across ALL of these categories. ${emphasis}

Return ONLY valid JSON with this exact structure:

{
  "findings": [
    {
      "category": "consumer-protection" | "contract-risk" | "notary-compliance" | "general",
      "clause": "Name of the clause or section",
      "concern": "What the concern is, in plain English",
      "recommendation": "What action to take",
      "risk": "low" | "moderate" | "high" | "critical"
    }
  ],
  "recommendation": "sign" | "review" | "reject"
}

Risk levels:
- low = standard language, no issues
- moderate = minor concerns worth negotiating
- high = significant risk, negotiate or modify
- critical = do not sign without major changes

Recommendations:
- sign = safe to sign as-is
- review = review these clauses before signing
- reject = critical issues that must be addressed first

CATEGORY 1: consumer-protection — Check for:
- Hidden fees or unclear pricing
- Auto-renewal clauses that lock the consumer in
- One-sided liability waivers
- Unfair cancellation or termination penalties
- Mandatory arbitration that removes the right to sue
- Terms that can be changed unilaterally without notice
- Excessive data collection or privacy concerns

CATEGORY 2: contract-risk — Check for:
- Overly broad indemnification clauses
- IP assignment that transfers all rights
- Unilateral termination rights
- Missing or unfavorable governing law / jurisdiction
- Warranty disclaimers that remove all protections
- Force majeure clauses that are one-sided
- Non-compete or non-solicitation restrictions

CATEGORY 3: notary-compliance — Check for:
- Complete signature blocks (signer name, date, capacity)
- Notary certificate language (acknowledgment vs. jurat)
- Witness requirements met
- Venue statement (State, County)
- Document completeness (no blank spaces, all pages present)
- Date consistency across all signatures

CATEGORY 4: general — Any other legal concern not covered above.

${contextLine}

Document text:
${documentText}`;
}

/**
 * Returns a weighting instruction based on the auto-detected context.
 * The comprehensive prompt always covers all categories, but the detected
 * context gets extra emphasis so the LLM prioritizes it.
 */
function getEmphasisInstruction(context: AutoDetectedContext): string {
  switch (context) {
    case 'consumer-contract':
      return 'This appears to be a CONSUMER CONTRACT. Prioritize consumer-protection concerns (hidden fees, auto-renewal, unfair terms) while still checking for contract-risk and notary-compliance issues.';
    case 'business-agreement':
      return 'This appears to be a BUSINESS AGREEMENT. Prioritize contract-risk concerns (indemnification, IP, governing law, termination) while still checking for consumer-protection and notary-compliance issues.';
    case 'notarized-document':
      return 'This appears to be a NOTARIZED DOCUMENT. Prioritize notary-compliance concerns (signature blocks, certificate language, witness requirements) while still checking for consumer-protection and contract-risk issues.';
    case 'general-legal':
      return 'This appears to be a GENERAL LEGAL DOCUMENT. Analyze all categories (consumer-protection, contract-risk, notary-compliance, general) with equal weight.';
  }
}

function buildContextLine(hint?: AgentContextHint): string {
  if (!hint) return '';

  const parts: string[] = [];
  if (hint.entityType) {
    parts.push(`The entity type is: ${hint.entityType}.`);
  }
  if (hint.jurisdiction) {
    parts.push(`The jurisdiction is: ${hint.jurisdiction}.`);
  }
  if (hint.counterpartyName) {
    parts.push(`The counterparty is: ${hint.counterpartyName}.`);
  }

  if (parts.length === 0) return '';
  return `Additional context: ${parts.join(' ')}`;
}

/**
 * Builds a prompt for structured contract model extraction.
 * The LLM returns ONLY valid JSON matching the ContractModel schema.
 * This is the machine-readable truth — the SVG is a visual rendering of this data.
 */
export function buildExtractionPrompt(
  documentText: string,
  detectedContext: AutoDetectedContext,
): string {
  return `You are a contract structure analyzer. Given the following legal document text, extract its structural elements into a JSON model. Do NOT analyze risk or give recommendations. Only extract structure.

Return ONLY valid JSON with this exact structure:

{
  "title": "Short document title",
  "parties": [
    { "id": "p1", "name": "Party name", "role": "signer | counterparty | beneficiary | witness | trustee | executor | agent | lender | borrower", "walletAddress": null }
  ],
  "obligations": [
    { "from": "p1", "to": "p2", "description": "What must be done", "type": "payment | delivery | service | restriction | disclosure" }
  ],
  "conditions": [
    { "description": "If/then condition", "trigger": "What triggers this", "outcome": "What happens", "type": "time-gate | event | threshold" }
  ],
  "assets": [
    { "description": "What moves", "type": "usdc | property | rights | tokens | other", "amount": "optional", "beneficiary": "party id" }
  ],
  "timeline": [
    { "event": "Event name", "date": null, "relativeDays": null, "description": "When this happens" }
  ]
}

Context: this document was auto-detected as "${detectedContext}". Use the following emphasis:
${getExtractionContextInstructions(detectedContext)}

Rules:
- Use short, descriptive names for parties (e.g., "Alice (Testator)", "Emma (Beneficiary)")
- Every obligation must have a clear "from" and "to" party id
- Conditions should capture if/then logic (e.g., "IF death certificate filed THEN distribute assets")
- Include ALL parties mentioned in the document
- Include ALL significant obligations and conditions
- For wills: identify testator, beneficiaries, executor, witnesses, specific bequests, residuary clause
- For NDAs: identify disclosing party, receiving party, confidentiality period, exclusions
- For vendor contracts: identify buyer, seller, deliverables, payment terms, deadlines
- For loan documents: identify borrower, lender, loan amount, rate, term, collateral

Document text:
${documentText}`;
}

function getExtractionContextInstructions(context: AutoDetectedContext): string {
  switch (context) {
    case 'consumer-contract':
      return 'Focus on: buyer/seller identification, payment terms, cancellation rights, auto-renewal conditions, service obligations.';
    case 'business-agreement':
      return 'Focus on: vendor/counterparty identification, indemnification obligations, IP assignment, delivery milestones, payment schedules, governing law.';
    case 'notarized-document':
      return 'Focus on: signer identification (person appearing before notary), notary as witness, document type (will/POA/deed/affidavit), witness requirements, notary certificate.';
    case 'general-legal':
      return 'Extract all parties, obligations, conditions, assets, and timeline events equally.';
  }
}

/**
 * Builds a prompt for consumer-facing risk assessment with industry benchmarks
 * and plain-English translations. Returns structured RiskAssessment JSON.
 *
 * Phase 2.5 — /review consumer document analysis service.
 * Every risk issue includes: what the clause says, what it means in plain English,
 * how it compares to industry standards, and what to do about it.
 */
export function buildRiskPrompt(documentText: string, documentType: string): string {
  const benchmarks = getBenchmarksForType(documentType);

  return `You are a consumer document review assistant. Analyze the following ${documentType} text for risks, unfair terms, and issues that could harm the signer. You MUST provide industry benchmark comparisons so the user understands what is "normal."

Return ONLY valid JSON with this exact structure:

{
  "riskLevel": "high" | "moderate" | "low",
  "score": 0-100,
  "documentType": "${documentType}",
  "summary": "One paragraph plain-English summary of what this document does and who it affects",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "category": "term" | "obligation" | "scope" | "completeness" | "jurisdiction" | "penalty" | "definition",
      "clause": "The original clause text from the document",
      "plainEnglish": "Plain-English translation of what this clause means in practice",
      "explanation": "Why this is a problem for the person signing",
      "recommendation": "Specific action to take (e.g., 'Request a 2-year term instead of perpetual')"
    }
  ],
  "benchmarks": [
    {
      "label": "What is being compared",
      "standard": "Industry standard value",
      "yours": "This document's value",
      "assessment": "above" | "at" | "below"
    }
  ]
}

Risk levels:
- high = multiple critical issues, significant legal disadvantage, do not sign without changes
- moderate = some concerns worth addressing before signing
- low = standard terms, minor or no issues

Score: 0 = worst possible, 100 = best possible (fully balanced, industry-standard terms).

Categories:
- term = duration/expiry issues
- obligation = one-sided or unfair obligations
- scope = overly broad or vague definitions
- completeness = missing required elements
- jurisdiction = unfair governing law or venue
- penalty = excessive damages or fees
- definition = unclear or overly broad definitions

${benchmarks}

Document text:
${documentText}`;
}

/**
 * Builds a prompt for legal knowledge Q&A — conversational, web-research-backed.
 * The agent provides directional guidance (NOT legal advice), identifies key
 * legal areas, and suggests actionable next steps. Always includes disclaimer.
 *
 * Phase 3 — Legal Clarity Agent for Circle Marketplace.
 */
export function buildKnowledgePrompt(
  query: string,
  jurisdiction?: string,
  entityType?: string,
): string {
  const jurisdictionLine = jurisdiction
    ? `\nJurisdiction context: ${jurisdiction}. Scope your guidance to this jurisdiction's legal framework.`
    : '\nIf a jurisdiction is not specified, provide general guidance applicable across common law jurisdictions (US/UK/Commonwealth).';
  const entityLine = entityType
    ? `\nThe person asking is a: ${entityType}. Tailor guidance to their perspective and needs.`
    : '';

  return `You are a legal clarity assistant — not a lawyer, not providing legal advice. Your role is to provide DIRECTIONAL GUIDANCE to help someone understand what legal areas they should research and what steps they might take.

The user asked: "${query}"
${jurisdictionLine}${entityLine}

Return ONLY valid JSON with this exact structure:

{
  "guidance": "A comprehensive but clear explanation of the legal landscape around this question. Include what the person should know, common pitfalls, and practical considerations. Write in plain English — avoid legalese unless defining a term. Be thorough but accessible. MAX 500 words.",
  "areas": ["Area 1", "Area 2", "Area 3"],
  "nextSteps": [
    "Specific actionable step 1 (e.g., 'Consult a startup attorney to review entity formation options')",
    "Specific actionable step 2",
    "Specific actionable step 3"
  ],
  "sources": [
    {
      "title": "Descriptive title of a recommended resource",
      "url": "https://example.com/resource",
      "snippet": "Brief description of what this resource covers",
      "relevance": "high"
    }
  ],
  "disclaimer": "This is directional guidance only, not legal advice. Laws vary by jurisdiction. Consult a qualified attorney before making legal decisions. Signet provides document analysis and attestation services — not legal representation."
}

IMPORTANT RULES:
1. The "guidance" field MUST be comprehensive — at least 150 words. Cover the key legal concepts, common structures, regulatory considerations, and practical trade-offs.
2. The "areas" array MUST have 3-7 distinct legal areas relevant to the query (e.g., "Securities Law", "Entity Formation", "Intellectual Property", "Tax Treatment", "Employment Law").
3. The "nextSteps" array MUST have 3-7 concrete, actionable steps ordered by priority. Each step should be specific enough that the person could do it tomorrow.
4. The "sources" array MUST have 2-5 authoritative resources. Use real, reputable sources (SEC.gov, IRS.gov, law school clinics, bar association guides, established legal tech platforms). Provide realistic URLs — do not make up fake URLs. If unsure of a specific URL, describe the type of resource to seek (e.g., "Search: SEC small business compliance guide").
5. ALWAYS include the disclaimer exactly as shown — this is mandatory.
6. NEVER provide specific legal advice like "You should form an LLC in Delaware." Instead say "Many startups consider Delaware C-corps for venture funding, but an LLC may be simpler for bootstrapped businesses. Research both."
7. If the question involves multiple jurisdictions, note the differences.
8. If the question is too vague, ask clarifying questions in the guidance field rather than assuming.

Example for "What legal structure for a web3 startup?":
- areas: ["Entity Formation", "Securities Law", "Token Classification", "Intellectual Property", "DAO Legal Wrappers", "Tax Treatment", "Regulatory Compliance"]
- nextSteps: ["Research Delaware C-corp vs Wyoming DAO LLC structures", "Consult a crypto-native attorney about token classification (utility vs security)", "Review SEC's Framework for Digital Assets", "Set up IP assignment agreements for all contributors", "Evaluate need for money transmitter licenses based on your token's function"]
- sources: [{"title": "SEC Framework for Digital Assets", "url": "https://www.sec.gov/corpfin/framework-investment-contract-analysis-digital-assets", "snippet": "How the SEC evaluates whether a digital asset is a security", "relevance": "high"}, ...]`;
}

function getBenchmarksForType(documentType: string): string {
  switch (documentType.toLowerCase()) {
    case 'nda':
    case 'non-disclosure agreement':
      return `BENCHMARK DATA FOR NDAs:
- Term: Industry standard is 2-3 years. Perpetual terms are a red flag.
- Mutual obligations: Standard NDAs are mutual (both parties bound). One-sided NDAs are high risk.
- Independent development carve-out: Standard NDAs exclude independent development. Missing this is a warning.
- Residuals clause: Standard NDAs allow use of residual knowledge. Clauses that prohibit this are restrictive.
- Governing law: Should be the signer's home state. Foreign jurisdiction is a warning.
- Scope: "Confidential Information" should be specifically defined, not "any information shared."`;

    case 'will':
    case 'last will and testament':
      return `BENCHMARK DATA FOR WILLS:
- Witnesses: Most states require 2 disinterested witnesses. Missing witnesses = invalid will.
- Executor: Must be clearly designated. Missing executor = probate court appoints one.
- Beneficiaries: Must be specifically identified. Vague beneficiaries ("my children" without names) cause disputes.
- Residuary clause: Should specify who gets remaining assets. Missing = partial intestacy.
- Self-proving affidavit: Notarized witness affidavits streamline probate. Missing = witnesses must testify.
- Revocation clause: Should explicitly revoke prior wills. Missing = potential conflicts.`;

    case 'lease':
    case 'rental agreement':
      return `BENCHMARK DATA FOR LEASES:
- Security deposit: Standard is 1-2 months rent. Higher deposits are a warning.
- Maintenance obligations: Landlord is typically responsible for major repairs. Tenant-only maintenance is unfair.
- Termination notice: Standard is 30 days. Shorter notice periods disadvantage the tenant.
- Renewal terms: Auto-renewal with significant rent increases is a red flag.
- Subletting: Standard leases allow subletting with landlord consent. Blanket prohibition is restrictive.
- Late fees: Should be reasonable (5-10% of rent). Excessive late fees may be unenforceable.`;

    case 'contract':
    case 'vendor agreement':
    case 'service agreement':
      return `BENCHMARK DATA FOR CONTRACTS:
- Termination: Should allow termination for convenience with reasonable notice (30 days). Termination for cause only is restrictive.
- Liability cap: Should be proportional to contract value. Unlimited liability is critical risk.
- Indemnification: Should be mutual or proportional. One-sided indemnification is high risk.
- Governing law: Should be the signer's home state.
- Dispute resolution: Mediation before arbitration is standard. Mandatory arbitration that waives class action rights is a warning.
- Payment terms: Net-30 is standard. Net-60+ disadvantages the service provider.`;

    default:
      return `BENCHMARK DATA:
- Check for completeness: all parties identified, dates present, signature blocks complete.
- Check for contradictory clauses.
- Check for undefined terms.
- Check for one-sided obligations.`;
  }
}
