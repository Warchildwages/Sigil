/**
 * Regulatory Agent — Core Logic
 * Cross-border regulatory mapping, reporting requirements, ERC-3643 compliance.
 */

export interface RegulatoryCheck {
  sourceJurisdiction: string;
  targetJurisdiction: string;
  assetClass: string;
  amount: string;
  participants: { role: string; jurisdiction: string }[];
}

export interface RegulatoryResult {
  reportable: boolean;
  requiredFilings: string[];
  deadlines: { authority: string; daysRemaining: number }[];
  restrictions: string[];
  applicableStandards: string[];
}

// Map of regulatory standards by jurisdiction
const REGULATORY_STANDARDS: Record<string, { standards: string[]; filings: string[] }> = {
  US: {
    standards: ['SEC_Regulation_D', 'FinCEN_MSB', 'OFAC_Sanctions', 'ESIGN_Act'],
    filings: ['FinCEN_BSAR', 'SEC_Form_D', 'Suspicious_Activity_Report'],
  },
  UK: {
    standards: ['FCA_Threshold', 'MLR_2017', 'JMLSG_Guidance'],
    filings: ['FCA_Registration', 'SAR_Submission'],
  },
  EU: {
    standards: ['MiCA', 'AMLR6', 'GDPR', 'eIDAS2'],
    filings: ['AMLA_Registration', 'ESMA_Notification', 'Data_Protection_Assessment'],
  },
  SG: {
    standards: ['PSA_2019', 'MAS_Notice_626', 'MICA_Act'],
    filings: ['MAS_License', 'AML_CFT_Return'],
  },
  JP: {
    standards: ['FSA_PSA_VASP', 'JFSA_Guidance', 'AML_Affirmative'],
    filings: ['FSA_Registration', 'JFSA_Periodic_Report'],
  },
  CH: {
    standards: ['FINMA_AMLA', 'DltA_Blockchain_Act', 'VASP_Guidance'],
    filings: ['FINMA_License', 'AMLA_Declaration'],
  },
};

const STABLECOIN_BLOCKED: Record<string, string[]> = {
  EU: ['USDC_nonMiCA', 'BUSD'],
  CN: ['ALL_FOREIGN'],
  RU: ['ALL_FOREIGN'],
};

export function getStandards(jurisdiction: string): { standards: string[]; filings: string[] } {
  return REGULATORY_STANDARDS[jurisdiction.toUpperCase()] ?? {
    standards: ['GENERIC_AML', 'GENERIC_KYC'],
    filings: ['GENERIC_REPORT'],
  };
}

export function checkCrossBorderRestrictions(
  source: string,
  target: string,
  assetClass: string
): string[] {
  const restrictions: string[] = [];
  const src = source.toUpperCase();
  const tgt = target.toUpperCase();

  // Check for sanctioned corridors
  const blocked = [['RU', 'US'], ['IR', 'EU'], ['KP', 'ALL']];
  for (const [from, to] of blocked) {
    if (src === from && (to === 'ALL' || tgt === to)) {
      restrictions.push(`CROSS_BORDER_BLOCKED: ${from}→${tgt} corridor is restricted`);
    }
  }

  // Stablecoin-specific restrictions
  if (assetClass.toLowerCase().includes('stablecoin') || assetClass.toLowerCase().includes('usdc')) {
    const blockedAssets = STABLECOIN_BLOCKED[tgt] || [];
    if (blockedAssets.includes('ALL_FOREIGN')) {
      restrictions.push(`STABLECOIN_BLOCKED: Foreign stablecoins prohibited in ${tgt}`);
    }
    if (blockedAssets.length > 0 && !blockedAssets.includes('ALL_FOREIGN')) {
      restrictions.push(`STABLECOIN_RESTRICTED: ${blockedAssets.join(', ')} restricted in ${tgt}`);
    }
  }

  return restrictions;
}

export function estimateDeadlines(standards: string[]): { authority: string; daysRemaining: number }[] {
  const deadlines: { authority: string; daysRemaining: number }[] = [];
  
  if (standards.includes('MiCA')) {
    deadlines.push({ authority: 'ESMA', daysRemaining: 180 });
  }
  if (standards.includes('SEC_Regulation_D')) {
    deadlines.push({ authority: 'SEC', daysRemaining: 15 });
  }
  if (standards.includes('FinCEN_MSB')) {
    deadlines.push({ authority: 'FinCEN', daysRemaining: 30 });
  }
  if (standards.includes('FCA_Threshold')) {
    deadlines.push({ authority: 'FCA', daysRemaining: 28 });
  }
  if (standards.includes('MAS_Notice_626')) {
    deadlines.push({ authority: 'MAS', daysRemaining: 90 });
  }

  return deadlines;
}

export function runRegulatoryCheck(check: RegulatoryCheck): RegulatoryResult {
  const srcStandards = getStandards(check.sourceJurisdiction);
  const tgtStandards = getStandards(check.targetJurisdiction);

  const restrictions = checkCrossBorderRestrictions(
    check.sourceJurisdiction,
    check.targetJurisdiction,
    check.assetClass
  );

  const mergedStandards = [...new Set([...srcStandards.standards, ...tgtStandards.standards])];
  const mergedFilings = [...new Set([...srcStandards.filings, ...tgtStandards.filings])];
  const deadlines = estimateDeadlines(mergedStandards);

  return {
    reportable: restrictions.length === 0,
    requiredFilings: mergedFilings,
    deadlines,
    restrictions,
    applicableStandards: mergedStandards,
  };
}
