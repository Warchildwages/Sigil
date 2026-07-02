// Arc Transaction Memos — Onchain Notary Journal
//
// Wraps USDC transfers on Arc Testnet with structured memo metadata.
// Each memo creates an immutable journal entry:
//   BeforeMemo { memoIndex }  →  journal entry number
//   Memo { memoId, memo }     →  queryable record
//   Transfer { from, to }     →  payment proof
//
// The memoId is deterministic: keccak256("notarial-act-" + documentHash)
// This makes every notarial act queryable forever on Arc.
//
// Arc Testnet contracts:
//   Memo: 0x5294E9927c3306DcBaDb03fe70b92e01cCede505
//   USDC: 0x3600000000000000000000000000000000000000

import { encodeFunctionData, keccak256, stringToHex } from 'viem';

// ── Contract Addresses (Arc Testnet) ──

export const ARC_MEMO_ADDRESS = '0x5294E9927c3306DcBaDb03fe70b92e01cCede505';
export const ARC_USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

// ── ABI Fragments ──

/** Memo function ABI — memo(address target, bytes data, bytes32 memoId, bytes memoData) */
export const MEMO_FUNCTION_ABI = {
  name: 'memo',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'target', type: 'address' },
    { name: 'data', type: 'bytes' },
    { name: 'memoId', type: 'bytes32' },
    { name: 'memoData', type: 'bytes' },
  ],
  outputs: [],
} as const;

/** Memo event ABI */
export const MEMO_EVENT_ABI = {
  name: 'Memo',
  type: 'event',
  inputs: [
    { name: 'sender', type: 'address', indexed: true },
    { name: 'target', type: 'address', indexed: true },
    { name: 'callDataHash', type: 'bytes32', indexed: false },
    { name: 'memoId', type: 'bytes32', indexed: true },
    { name: 'memo', type: 'bytes', indexed: false },
    { name: 'memoIndex', type: 'uint256', indexed: false },
  ],
} as const;

/** BeforeMemo event ABI */
export const BEFORE_MEMO_EVENT_ABI = {
  name: 'BeforeMemo',
  type: 'event',
  inputs: [{ name: 'memoIndex', type: 'uint256', indexed: true }],
} as const;

/** ERC-20 transfer ABI fragment */
export const ERC20_TRANSFER_ABI = {
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
} as const;

// ── Memo Building ──

/** Prefix for notarial act memoIds */
export const NOTARIAL_ACT_PREFIX = 'notarial-act-';

/**
 * Build a deterministic memoId from a document hash.
 * memoId = keccak256("notarial-act-" + documentHash)
 *
 * @param documentHash - SHA-256 hash of the document content
 * @returns bytes32 memoId for use in Memo.memo()
 */
export function buildMemoId(documentHash: string): string {
  return keccak256(stringToHex(`${NOTARIAL_ACT_PREFIX}${documentHash}`));
}

/**
 * Encode a USDC transfer call for use as memo target data.
 *
 * @param recipient - USDC recipient address
 * @param amountUSDC - Amount in USDC (6 decimals, 1 USDC = 1_000_000)
 * @returns Encoded transfer calldata
 */
export function encodeTransferData(recipient: string, amountUSDC: bigint): string {
  return encodeFunctionData({
    abi: [ERC20_TRANSFER_ABI],
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amountUSDC],
  });
}

/**
 * Encode memo call data for Memo.memo(target, data, memoId, memoData).
 */
export function encodeMemoCall(
  target: string,
  data: string,
  memoId: string,
  memoData: string,
): string {
  return encodeFunctionData({
    abi: [MEMO_FUNCTION_ABI],
    functionName: 'memo',
    args: [
      target as `0x${string}`,
      data as `0x${string}`,
      memoId as `0x${string}`,
      memoData as `0x${string}`,
    ],
  });
}

// ── Notarial Memo Helpers ──

export interface NotaryJournalEntry {
  memoId: string;
  memoIndex: bigint;
  sender: string;
  documentHash: string;
  attestationUID?: string;
  memoData: string;
  blockNumber?: bigint;
  transactionHash?: string;
}

/**
 * Build a notary journal memo.
 *
 * The memoId links to the document. The memoData carries the signer address,
 * document hash, and attestation UID as ABI-encoded bytes.
 *
 * @param documentHash - SHA-256 of the document
 * @param signerAddress - Address of the signer
 * @param attestationUID - Optional EAS attestation UID
 * @returns { memoId, memoData } ready for Memo.memo()
 */
export function buildNotaryMemo(
  documentHash: string,
  signerAddress: string,
  attestationUID?: string,
): { memoId: string; memoData: string } {
  const memoId = buildMemoId(documentHash);

  // Build memoData as a compact representation
  // Format: "signer:<address>|doc:<hash>|attestation:<uid>"
  const parts = [`signer:${signerAddress.toLowerCase()}`, `doc:${documentHash}`];
  if (attestationUID) {
    parts.push(`attestation:${attestationUID}`);
  }
  const memoData = stringToHex(parts.join('|'));

  return { memoId, memoData };
}

/**
 * Get the Arc block explorer URL for a memo by memoId.
 */
export function getArcMemoExplorerUrl(memoId: string): string {
  return `https://testnet.arcscan.app/address/${ARC_MEMO_ADDRESS}?tab=events&memoId=${memoId}`;
}

// ── Memo Execution ──

export interface MemoCallData {
  /** Target address (USDC contract) */
  to: `0x${string}`;
  /** ABI-encoded Memo.memo() call */
  data: `0x${string}`;
  /** ETH value (always 0 for memos) */
  value: bigint;
}

export interface MemoExecutionResult {
  memoId: string;
  memoIndex: string;
  transactionHash: string;
  arcscanUrl: string;
}

/**
 * Prepare memo call data for execution via Circle bundler.
 *
 * Builds the encoded Memo.memo() call that wraps a zero-value USDC transfer
 * with notary journal metadata. The returned call data can be sent via
 * sendUserOp() from circle.ts — either standalone or batched with an EAS attestation.
 *
 * @param documentHash - SHA-256 content hash of the document
 * @param signerAddress - Address of the signer (0x-prefixed)
 * @param attestationUID - Optional EAS attestation UID to link memo to attestation
 * @returns Memo call data ready for sendUserOp() + deterministic memoId
 */
export function prepareMemoCall(
  documentHash: string,
  signerAddress: string,
  attestationUID?: string,
): { callData: MemoCallData; memoId: string; memoData: string } {
  const { memoId, memoData } = buildNotaryMemo(documentHash, signerAddress, attestationUID);

  // Encode a zero-value USDC transfer as the memo target data
  const transferData = encodeTransferData(signerAddress as `0x${string}`, 0n);

  // Encode the Memo.memo(USDC, transferData, memoId, memoData) call
  const encodedCall = encodeMemoCall(ARC_USDC_ADDRESS, transferData, memoId, memoData);

  return {
    callData: {
      to: ARC_MEMO_ADDRESS as `0x${string}`,
      data: encodedCall as `0x${string}`,
      value: 0n,
    },
    memoId,
    memoData,
  };
}

/**
 * Execute a memo transaction on Arc via the Circle bundler.
 *
 * Requires a Circle Smart Account (passkey-authenticated). The memo is sent
 * as a gasless user operation via the paymaster.
 *
 * @param documentHash - SHA-256 content hash of the document
 * @param signerAddress - Address of the signer
 * @param attestationUID - Optional EAS attestation UID
 * @param chainId - Arc Testnet chain ID (5042002)
 * @param account - Circle Smart Account from passkey login
 * @returns Memo execution result with memoId, memoIndex, txHash, and ArcScan URL
 */
export async function executeMemoTransaction(
  documentHash: string,
  signerAddress: string,
  attestationUID: string | undefined,
  chainId: number,
  account: import('viem/account-abstraction').SmartAccount,
): Promise<MemoExecutionResult> {
  // Dynamic import to avoid circular dependency at module init
  const { sendUserOp } = await import('./circle.js');
  const { CHAIN_IDS } = await import('@sigil/shared');

  const { callData, memoId } = prepareMemoCall(documentHash, signerAddress, attestationUID);

  // Determine modular wallet path for Arc
  const modularWalletPath = chainId === CHAIN_IDS.ARC_TESTNET ? '/arcTestnet' : '/baseSepolia';

  const txHash = await sendUserOp(
    chainId as import('./circle.js').SupportedChainId,
    modularWalletPath,
    account,
    [callData],
  );

  // memoIndex would come from parsing BeforeMemo/Memo events in the receipt.
  // The bundler returns a userOpHash; the actual txHash and events require
  // polling the receipt. For now, memoIndex is "0" (first memo for this memoId).
  // Production should parse the event log from the finalized receipt.
  const memoIndex = '0';

  return {
    memoId,
    memoIndex,
    transactionHash: txHash,
    arcscanUrl: getArcMemoExplorerUrl(memoId),
  };
}
