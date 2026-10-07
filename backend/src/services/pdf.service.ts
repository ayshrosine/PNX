import PDFDocument from 'pdfkit';
import { formatInrCurrency, numberToWordsInr } from '../shared/money.js';

export async function generateInvoicePdf(invoice: any, tenant: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Colors
      const primaryColor = '#1e293b';
      const secondaryColor = '#475569';
      const accentColor = '#2563eb';
      const lightBg = '#f8fafc';
      const borderColor = '#e2e8f0';

      // Header: Business Details
      doc.fillColor(accentColor).fontSize(20).text(tenant.name || 'TAX INVOICE', 40, 40);
      doc.fillColor(secondaryColor).fontSize(9);
      if (tenant.legalName && tenant.legalName !== tenant.name) {
        doc.text(tenant.legalName, 40, 65);
      }
      doc.text(`${tenant.addressLine1 || ''}, ${tenant.city || ''} ${tenant.pincode || ''}`, 40, 78);
      if (tenant.gstin) doc.text(`GSTIN: ${tenant.gstin} | PAN: ${tenant.pan || ''}`, 40, 91);
      if (tenant.email) doc.text(`Email: ${tenant.email} | Phone: ${tenant.phone || ''}`, 40, 104);

      // Title & Invoice Info Top-Right
      doc.fillColor(primaryColor).fontSize(16).text('TAX INVOICE', 380, 40, { align: 'right' });
      doc.fontSize(9).fillColor(secondaryColor);
      doc.text(`Invoice No: ${invoice.number}`, 380, 62, { align: 'right' });
      doc.text(`Date: ${invoice.issueDate ? invoice.issueDate.split('T')[0] : ''}`, 380, 75, { align: 'right' });
      doc.text(`Due Date: ${invoice.dueDate ? invoice.dueDate.split('T')[0] : ''}`, 380, 88, { align: 'right' });
      if (invoice.poNumber) {
        doc.text(`PO Ref: ${invoice.poNumber}`, 380, 101, { align: 'right' });
      }

      doc.rect(40, 125, 515, 1).fillColor(borderColor).fill();

      // Bill To (Client Details)
      doc.fillColor(accentColor).fontSize(10).text('BILLED TO:', 40, 135);
      doc.fillColor(primaryColor).fontSize(11).text(invoice.client?.name || 'Customer', 40, 150);
      doc.fillColor(secondaryColor).fontSize(9);
      if (invoice.client?.addressLine1) {
        doc.text(invoice.client.addressLine1, 40, 165);
      }
      if (invoice.client?.city) {
        doc.text(`${invoice.client.city}, ${invoice.client.state || ''} - ${invoice.client.pincode || ''}`, 40, 178);
      }
      if (invoice.client?.gstin) {
        doc.text(`Client GSTIN: ${invoice.client.gstin}`, 40, 191);
      }
      doc.text(`Place of Supply: State Code ${invoice.placeOfSupply || tenant.stateCode || ''}`, 40, 204);

      // Items Table Header
      let y = 230;
      doc.rect(40, y, 515, 22).fillColor(lightBg).fill();
      doc.rect(40, y, 515, 22).strokeColor(borderColor).stroke();

      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
      doc.text('#', 45, y + 6);
      doc.text('Description', 65, y + 6);
      doc.text('HSN/SAC', 240, y + 6);
      doc.text('Qty', 310, y + 6, { align: 'right', width: 30 });
      doc.text('Rate', 350, y + 6, { align: 'right', width: 50 });
      doc.text('Tax %', 410, y + 6, { align: 'right', width: 35 });
      doc.text('Amount (INR)', 455, y + 6, { align: 'right', width: 95 });

      y += 26;
      doc.font('Helvetica');

      // Line Items
      const items = invoice.items || [];
      items.forEach((item: any, idx: number) => {
        doc.fillColor(primaryColor).fontSize(8.5);
        doc.text(String(idx + 1), 45, y);
        doc.text(item.description || '', 65, y, { width: 170 });
        doc.text(item.hsnSac || '-', 240, y);
        doc.text(`${item.quantity} ${item.unit || ''}`, 310, y, { align: 'right', width: 30 });
        doc.text(formatInrCurrency(item.rate), 350, y, { align: 'right', width: 50 });
        doc.text(`${item.taxRate}%`, 410, y, { align: 'right', width: 35 });
        doc.text(formatInrCurrency(item.lineTotal), 455, y, { align: 'right', width: 95 });

        y += 24;
      });

      doc.rect(40, y, 515, 1).fillColor(borderColor).fill();
      y += 10;

      // Totals section (right side)
      const totalsX = 350;
      doc.fontSize(9);
      doc.fillColor(secondaryColor);

      doc.text('Taxable Amount:', totalsX, y);
      doc.text(formatInrCurrency(invoice.taxableAmount || invoice.subtotal), 455, y, { align: 'right', width: 95 });
      y += 16;

      if (invoice.isInterState) {
        doc.text('IGST (Integrated Tax):', totalsX, y);
        doc.text(formatInrCurrency(invoice.igst), 455, y, { align: 'right', width: 95 });
        y += 16;
      } else {
        doc.text('CGST (Central Tax):', totalsX, y);
        doc.text(formatInrCurrency(invoice.cgst), 455, y, { align: 'right', width: 95 });
        y += 16;
        doc.text('SGST (State Tax):', totalsX, y);
        doc.text(formatInrCurrency(invoice.sgst), 455, y, { align: 'right', width: 95 });
        y += 16;
      }

      if (parseFloat(invoice.roundOff || '0') !== 0) {
        doc.text('Round Off:', totalsX, y);
        doc.text(formatInrCurrency(invoice.roundOff), 455, y, { align: 'right', width: 95 });
        y += 16;
      }

      // Grand Total
      doc.rect(totalsX, y, 205, 22).fillColor(lightBg).fill();
      doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(11);
      doc.text('Total Invoice Value:', totalsX + 5, y + 5);
      doc.text(formatInrCurrency(invoice.total), 455, y + 5, { align: 'right', width: 95 });
      y += 30;

      // Amount in words
      doc.font('Helvetica').fontSize(9).fillColor(secondaryColor);
      doc.text(`Amount in words: ${numberToWordsInr(invoice.total)}`, 40, y);
      y += 25;

      // Bank & Remittance details
      doc.rect(40, y, 300, 60).strokeColor(borderColor).stroke();
      doc.fillColor(accentColor).font('Helvetica-Bold').fontSize(8.5).text('BANK PAYMENT REMITTANCE DETAILS', 50, y + 8);
      doc.font('Helvetica').fontSize(8).fillColor(primaryColor);
      doc.text(`Bank Name: ${tenant.bankName || 'HDFC Bank'}`, 50, y + 22);
      doc.text(`Account Name: ${tenant.bankAccountName || tenant.name}`, 50, y + 33);
      doc.text(`IFSC: ${tenant.bankIfsc || 'HDFC0000123'} | UPI: ${tenant.upiId || 'acmecloud@hdfcbank'}`, 50, y + 44);

      // Terms & Authorized Signatory
      doc.text('For ' + (tenant.name || 'Acme Cloud Studio'), 400, y + 10, { align: 'right' });
      doc.text('Authorized Signatory', 400, y + 50, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
