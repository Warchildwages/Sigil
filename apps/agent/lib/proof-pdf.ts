// Attestation Proof PDF Generator
// Uses pdf-lib (pure JS, zero native deps, Node.js runtime compatible)
// Generates a downloadable, printable proof page with document metadata + attestation details

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Attestation } from '@signet/shared';
import { SUPPORTED_CHAINS } from '@signet/shared';

export interface ProofPdfData {
  attestation: Attestation;
  documentTitle: string;
  contentHash: string;
  entityName: string;
  entityType: string;
  /** Optional meeting attendee name */
  signerName?: string;
}

export async function generateProofPdf(data: ProofPdfData): Promise<Uint8Array> {
  const { attestation, documentTitle, contentHash, entityName, entityType, signerName } = data;

  const chain = SUPPORTED_CHAINS.find((c) => c.chainId === attestation.chainId);
  const chainName = chain?.name ?? `Chain ${attestation.chainId}`;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // ---- Header ----
  page.drawText('SIGNET', {
    x: margin,
    y,
    size: 28,
    font: fontBold,
    color: rgb(0.85, 0.46, 0.02), // amber
  });
  page.drawText('AT T E S T A T I O N  P R O O F', {
    x: margin + 110,
    y: y - 2,
    size: 14,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 12;

  page.drawText('The chain is the witness.', {
    x: margin + 110,
    y,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 40;

  // ---- Divider ----
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.85, 0.46, 0.02),
  });
  y -= 24;

  // ---- Document Info ----
  page.drawText('DOCUMENT', { x: margin, y, size: 11, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  y -= 18;

  page.drawText('Title:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(documentTitle, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText('Content Hash (SHA-256):', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(contentHash, { x: margin + 80, y, size: 8, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
  y -= 20;

  // ---- Signer Info ----
  page.drawText('SIGNER', { x: margin, y, size: 11, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
  y -= 18;

  const displayName = signerName ?? entityName;
  page.drawText('Signed by:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(displayName, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText('Entity:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`${entityName} (${entityType.replace(/_/g, ' ')})`, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText('Signer Address:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(attestation.attester, { x: margin + 80, y, size: 8, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
  y -= 24;

  // ---- Chain & Attestation Info ----
  page.drawText('B L O C K C H A I N  A T T E S T A T I O N', {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 18;

  page.drawText('Chain:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(chainName, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText('Protocol:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(attestation.protocol, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 16;

  page.drawText('Attestation UID:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(attestation.protocolUid, { x: margin + 80, y, size: 8, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
  y -= 16;

  if (attestation.transactionHash) {
    page.drawText('Transaction:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(attestation.transactionHash, { x: margin + 80, y, size: 8, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
    y -= 16;
  }

  page.drawText('Schema UID:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(attestation.schemaUid, { x: margin + 80, y, size: 8, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
  y -= 16;

  page.drawText('Attested At:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  const attestedDate = attestation.attestedAt
    ? new Date(attestation.attestedAt).toISOString()
    : new Date().toISOString();
  page.drawText(attestedDate, { x: margin + 80, y, size: 10, font: font, color: rgb(0, 0, 0) });
  y -= 24;

  // ---- Privacy ----
  page.drawText('Privacy Mode:', { x: margin, y, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(attestation.privacyMode.replace(/_/g, ' ').toUpperCase(), {
    x: margin + 80,
    y,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // ---- Verification Box ----
  const boxTop = y;
  const boxHeight = 60;
  page.drawRectangle({
    x: margin,
    y: boxTop - boxHeight,
    width: width - margin * 2,
    height: boxHeight,
    color: rgb(0.92, 0.94, 0.95),
    borderColor: rgb(0.85, 0.46, 0.02),
    borderWidth: 1,
  });

  const verifyY = boxTop - 20;
  page.drawText('VERIFY THIS ATTESTATION', {
    x: margin + 12,
    y: verifyY,
    size: 11,
    font: fontBold,
    color: rgb(0.85, 0.46, 0.02),
  });

  page.drawText('Scan the QR code or visit:', {
    x: margin + 12,
    y: verifyY - 16,
    size: 9,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // EASscan URL
  let verifyUrl = '';
  if (chain?.chainId === 84532) {
    verifyUrl = `https://base-sepolia.easscan.org/attestation/view/${attestation.protocolUid}`;
  } else if (chain?.chainId === 8453) {
    verifyUrl = `https://easscan.org/attestation/view/${attestation.protocolUid}`;
  }

  if (verifyUrl) {
    page.drawText(verifyUrl, {
      x: margin + 12,
      y: verifyY - 30,
      size: 7,
      font: fontMono,
      color: rgb(0.2, 0.4, 0.7),
    });
  }

  y = boxTop - boxHeight - 24;

  // ---- Footer ----
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;

  page.drawText('Generated by Signet — The chain is the witness.', {
    x: margin,
    y,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 12;

  page.drawText('https://signet.ventures', {
    x: margin,
    y,
    size: 8,
    font: font,
    color: rgb(0.2, 0.4, 0.7),
  });

  const pdfBytes = await doc.save();
  return pdfBytes;
}