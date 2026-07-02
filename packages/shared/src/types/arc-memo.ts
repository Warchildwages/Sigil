// Arc Memo Types — Onchain Notary Journal
//
// Arc Transaction Memos wrap USDC transfers with structured metadata,
// creating an immutable, queryable journal on Arc Testnet.
//
// Memo contract: 0x5294E9927c3306DcBaDb03fe70b92e01cCede505

/** Payload for executing a memo transaction via Circle bundler */
export interface MemoCallData {
  /** Memo contract address on Arc */
  target: string;
  /** ABI-encoded memo call (Memo.memo) */
  data: string;
  /** keccak256("notarial-act-" + documentHash) */
  memoId: string;
  /** ABI-encoded notary journal metadata */
  memoData: string;
}

/** Result of a successful memo journal entry on Arc */
export interface ArcMemoJournalEntry {
  /** keccak256("notarial-act-" + contentHash) — deterministic, queryable forever */
  memoId: string;
  /** Sequential journal index from BeforeMemo event — unique entry number */
  memoIndex: string;
  /** Transaction hash of the memo call on Arc */
  memoTransactionHash: string;
  /** Direct link to ArcScan explorer event view */
  arcscanUrl: string;
}
