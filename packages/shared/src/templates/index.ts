// Document templates — typed, fillable contract templates for demo use
// Each template has replaceable fields that get populated with entity/session data

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  category: 'nda' | 'vendor' | 'employment' | 'board' | 'event';
  fields: TemplateField[];
  /** Returns the filled document text with all fields resolved */
  bodyTemplate: (fields: Record<string, string>) => string;
}

const ndaFields: TemplateField[] = [
  { key: 'party1Name', label: 'Disclosing Party', placeholder: 'e.g. Acme Corp', defaultValue: 'Disclosing Party' },
  { key: 'party1Address', label: 'Disclosing Party Address', placeholder: 'e.g. 123 Main St, San Francisco, CA' },
  { key: 'party2Name', label: 'Receiving Party', placeholder: 'e.g. Partner Inc', defaultValue: 'Receiving Party' },
  { key: 'party2Address', label: 'Receiving Party Address', placeholder: 'e.g. 456 Market St, San Francisco, CA' },
  { key: 'effectiveDate', label: 'Effective Date', placeholder: 'e.g. June 20, 2026', defaultValue: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
  { key: 'purpose', label: 'Purpose', placeholder: 'e.g. Evaluation of potential business relationship' },
  { key: 'termYears', label: 'Confidentiality Term (Years)', placeholder: 'e.g. 3', defaultValue: '3' },
  { key: 'governingLaw', label: 'Governing Law', placeholder: 'e.g. State of California', defaultValue: 'State of California' },
];

const vendorFields: TemplateField[] = [
  { key: 'vendorName', label: 'Vendor Name', placeholder: 'e.g. SoundPro Audio', defaultValue: 'Vendor' },
  { key: 'vendorAddress', label: 'Vendor Address', placeholder: 'e.g. 789 Oak Ave, Austin, TX' },
  { key: 'clientName', label: 'Client / Organizer Name', placeholder: 'e.g. AllFans Events LLC', defaultValue: 'Client' },
  { key: 'clientAddress', label: 'Client Address', placeholder: 'e.g. 321 Broadway, New York, NY' },
  { key: 'eventName', label: 'Event Name', placeholder: 'e.g. Summer Music Festival 2026' },
  { key: 'eventDate', label: 'Event Date', placeholder: 'e.g. July 15, 2026' },
  { key: 'services', label: 'Services Description', placeholder: 'e.g. Live sound engineering and stage equipment rental' },
  { key: 'feeAmount', label: 'Fee (USDC)', placeholder: 'e.g. 2,500' },
  { key: 'paymentDueDate', label: 'Payment Due Date', placeholder: 'e.g. Within 30 days of event completion' },
  { key: 'governingLaw', label: 'Governing Law', placeholder: 'e.g. State of Texas', defaultValue: 'State of Texas' },
];

const eventFields: TemplateField[] = [
  { key: 'organizerName', label: 'Organizer / Platform', placeholder: 'e.g. AllFans Events LLC', defaultValue: 'Event Organizer' },
  { key: 'serviceProviderName', label: 'Service Provider', placeholder: 'e.g. Catering Co.', defaultValue: 'Service Provider' },
  { key: 'eventName', label: 'Event Name', placeholder: 'e.g. Creator Summit 2026' },
  { key: 'eventDate', label: 'Event Date', placeholder: 'e.g. August 10, 2026' },
  { key: 'venue', label: 'Venue', placeholder: 'e.g. Convention Center, Hall B' },
  { key: 'services', label: 'Services', placeholder: 'e.g. Catering for 200 attendees (lunch + refreshments)' },
  { key: 'feeAmount', label: 'Fee (USDC)', placeholder: 'e.g. 5,000' },
  { key: 'cancellationDays', label: 'Cancellation Notice (Days)', placeholder: 'e.g. 14', defaultValue: '14' },
  { key: 'insuranceRequired', label: 'Insurance Required', placeholder: 'e.g. General liability $1M', defaultValue: 'General liability $1M' },
  { key: 'governingLaw', label: 'Governing Law', placeholder: 'e.g. State of New York', defaultValue: 'State of New York' },
];

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'mutual-nda',
    title: 'Mutual Non-Disclosure Agreement',
    description: 'Standard mutual NDA for business discussions, vendor evaluations, and partnership exploration.',
    category: 'nda',
    fields: ndaFields,
    bodyTemplate: (f) => `MUTUAL NON-DISCLOSURE AGREEMENT

THIS MUTUAL NON-DISCLOSURE AGREEMENT (the "Agreement") is made and entered into as of ${f.effectiveDate}, by and between:

${f.party1Name}, located at ${f.party1Address} ("Disclosing Party"), and
${f.party2Name}, located at ${f.party2Address} ("Receiving Party"),

collectively referred to as the "Parties."

WHEREAS, the Parties wish to explore a potential business relationship concerning ${f.purpose} (the "Purpose"), and in connection therewith, each Party may disclose to the other certain confidential and proprietary information.

NOW, THEREFORE, in consideration of the mutual promises and covenants contained herein, the Parties agree as follows:

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any information, technical data, or know-how, including, but not limited to, research, product plans, products, services, customer lists, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, engineering, hardware configuration information, marketing, finances, or other business information disclosed by either Party to the other, either directly or indirectly, in writing, orally, or by drawings or observation of parts or equipment.

2. EXCLUSIONS
Confidential Information does not include information that: (a) is or becomes generally available to the public other than as a result of a disclosure by the Receiving Party; (b) was available to the Receiving Party on a non-confidential basis prior to its disclosure; (c) becomes available to the Receiving Party on a non-confidential basis from a source other than the Disclosing Party; or (d) is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information.

3. NON-DISCLOSURE AND NON-USE
Each Party agrees not to use any Confidential Information of the other Party for any purpose except to evaluate and engage in discussions concerning the Purpose. Each Party agrees not to disclose any Confidential Information of the other Party to third parties or to such Party's employees, except to those employees who are required to have the information in order to evaluate or engage in discussions concerning the Purpose.

4. TERM
The obligations of this Agreement shall survive for a period of ${f.termYears} years from the date of last disclosure of Confidential Information.

5. NO LICENSE
Nothing in this Agreement is intended to grant any rights to either Party under any patent, copyright, trademark, or other intellectual property right of the other Party, nor shall this Agreement grant either Party any rights in or to the Confidential Information of the other Party.

6. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the ${f.governingLaw}, without regard to conflicts of law principles.

7. ATTORNEYS' FEES
In the event of any litigation arising out of or relating to this Agreement, the prevailing party shall be entitled to recover its reasonable attorneys' fees and costs.

8. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof and supersedes all prior agreements, understandings, and representations.

IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

_____________________________
${f.party1Name}
Disclosing Party

_____________________________
${f.party2Name}
Receiving Party

---
ATTESTED ON SIGNET — The chain is the witness.
This document was cryptographically hashed and attested on-chain via EAS (Ethereum Attestation Service).
Attestation UID and proof PDF available for download after signing.
`,
  },
  {
    id: 'vendor-agreement',
    title: 'Vendor Services Agreement',
    description: 'Event services contract — perfect for AllFans vendor onboarding. Covers services, fees, and payment terms.',
    category: 'vendor',
    fields: vendorFields,
    bodyTemplate: (f) => `VENDOR SERVICES AGREEMENT

THIS VENDOR SERVICES AGREEMENT (the "Agreement") is made and entered into as of ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}, by and between:

${f.vendorName}, located at ${f.vendorAddress} ("Vendor"), and
${f.clientName}, located at ${f.clientAddress} ("Client"),

collectively referred to as the "Parties."

WHEREAS, Client is organizing ${f.eventName}, scheduled for ${f.eventDate} (the "Event"), and Vendor provides services related to the Event.

NOW, THEREFORE, the Parties agree as follows:

1. SERVICES
Vendor agrees to provide the following services for the Event: ${f.services}.

2. COMPENSATION
Client agrees to pay Vendor a total fee of ${f.feeAmount} USDC for the services described above. Payment shall be made via USDC transfer to Vendor's designated wallet address within 5 business days of confirmation of attestation of the event report.

3. PAYMENT TERMS
Payment is due: ${f.paymentDueDate}. Late payments shall accrue interest at the rate of 1.5% per month.

4. INDEPENDENT CONTRACTOR
Vendor is an independent contractor and not an employee, partner, or joint venturer of Client. Vendor is responsible for its own taxes, insurance, and compliance with applicable laws.

5. CANCELLATION
Either Party may cancel this Agreement with 14 days' written notice. In the event of cancellation by Client within 14 days of the Event, Client shall pay Vendor 50% of the agreed fee.

6. LIABILITY AND INDEMNIFICATION
Each Party agrees to indemnify and hold harmless the other Party from any claims, damages, or expenses arising out of the indemnifying Party's negligence or willful misconduct.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the ${f.governingLaw}.

8. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the Parties and supersedes all prior agreements and understandings.

IN WITNESS WHEREOF, the Parties have executed this Agreement.

_____________________________
${f.vendorName}
Vendor

_____________________________
${f.clientName}
Client

---
ATTESTED ON SIGNET — The chain is the witness.
Vendor onboarding contract signed and attested on-chain.
Download proof PDF with EAS attestation UID for your records.
`,
  },
  {
    id: 'event-services',
    title: 'Event Services Contract',
    description: 'Comprehensive event services agreement — services, cancellation policy, insurance requirements.',
    category: 'event',
    fields: eventFields,
    bodyTemplate: (f) => `EVENT SERVICES CONTRACT

THIS EVENT SERVICES CONTRACT (the "Agreement") is made effective as of ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} by and between:

${f.organizerName} ("Organizer"), and
${f.serviceProviderName} ("Service Provider"),

collectively referred to as the "Parties."

REGARDING: ${f.eventName} to be held on ${f.eventDate} at ${f.venue} (the "Event").

1. SCOPE OF SERVICES
Service Provider agrees to furnish the following services: ${f.services}. All services shall be performed in a professional and workmanlike manner in accordance with industry standards.

2. COMPENSATION
Organizer agrees to pay Service Provider ${f.feeAmount} USDC for the services. Payment shall be made within 10 business days following the conclusion of the Event and receipt of Service Provider's invoice.

3. CANCELLATION
Either Party may terminate this Agreement by providing ${f.cancellationDays} days' written notice prior to the Event date. If Organizer cancels with less than ${f.cancellationDays} days' notice, Organizer shall pay 50% of the total fee as liquidated damages.

4. INSURANCE
Service Provider shall maintain ${f.insuranceRequired} during the term of this Agreement and shall provide a certificate of insurance upon request.

5. FORCE MAJEURE
Neither Party shall be liable for any failure or delay in performance due to circumstances beyond its reasonable control, including acts of God, severe weather, government restrictions, or public health emergencies.

6. INDEMNIFICATION
Each Party agrees to indemnify the other against all claims arising from the indemnifying Party's breach of this Agreement or negligent acts or omissions.

7. INDEPENDENT CONTRACTOR
Service Provider is an independent contractor. Nothing in this Agreement shall be construed to create an employer-employee, partnership, or joint venture relationship.

8. GOVERNING LAW
This Agreement shall be governed by and construed under the laws of the ${f.governingLaw}.

9. ENTIRE AGREEMENT
This Agreement represents the entire understanding between the Parties and supersedes all prior negotiations and agreements.

IN WITNESS WHEREOF, the Parties have executed this Agreement.

_____________________________
${f.organizerName}
Organizer

_____________________________
${f.serviceProviderName}
Service Provider

---
ATTESTED ON SIGNET — The chain is the witness.
Event contract attested on-chain. Track all vendor agreements and payments in one place.
`,
  },
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}

export function fillTemplate(template: DocumentTemplate, fields: Record<string, string>): { title: string; body: string } {
  const resolvedFields: Record<string, string> = {};
  for (const f of template.fields) {
    resolvedFields[f.key] = fields[f.key] || f.defaultValue || f.placeholder;
  }
  return {
    title: template.title,
    body: template.bodyTemplate(resolvedFields),
  };
}