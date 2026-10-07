'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  CheckCircle2,
  Calendar,
  AlertCircle,
  CreditCard,
  Building,
  QrCode,
  ShieldCheck,
  Send,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function PublicInvoicePortalPage() {
  const params = useParams();
  const token = String(params.token);

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  // Modals / action drawers
  const [activeModal, setActiveModal] = useState<'PROMISE' | 'DISPUTE' | null>(null);
  const [promiseDate, setPromiseDate] = useState('');
  const [promiseNotes, setPromiseNotes] = useState('');
  const [disputeMessage, setDisputeMessage] = useState('');
  const [disputeEmail, setDisputeEmail] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.portal
      .getInvoice(token)
      .then((res) => {
        if (res?.data) {
          setInvoice(res.data);
          if (res.data.status === 'SENT' || res.data.status === 'PART_PAID') {
            // mark portal view
          }
        }
      })
      .catch((err) => {
        toast.error('Unable to load invoice: ' + err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownloadPdf = () => {
    const url = api.portal.getPdfUrl(token);
    window.open(url, '_blank');
  };

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await api.portal.acknowledge(token);
      setAcknowledged(true);
      toast.success('Thank you! Receipt of invoice acknowledged.');
    } catch (err: any) {
      toast.error('Failed to acknowledge: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromiseToPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promiseDate) {
      toast.error('Please select a payment date');
      return;
    }
    try {
      setActionLoading(true);
      await api.portal.promise(token, {
        promisedDate: promiseDate,
        message: promiseNotes || 'Client scheduled payment via online portal',
      });
      toast.success(`Payment date scheduled for ${formatDate(promiseDate)}! The vendor has been notified.`);
      setActiveModal(null);
    } catch (err: any) {
      toast.error('Failed to schedule payment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMessage.trim()) {
      toast.error('Please describe your question or issue');
      return;
    }
    try {
      setActionLoading(true);
      await api.portal.dispute(token, {
        message: disputeMessage,
        contactEmail: disputeEmail || undefined,
      });
      toast.success('Your message was forwarded to the vendor finance team.');
      setActiveModal(null);
    } catch (err: any) {
      toast.error('Failed to submit question: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 text-center">
        <FileText className="w-12 h-12 text-slate-600 mb-3" />
        <h1 className="text-xl font-bold text-white">Invoice Link Expired or Not Found</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please contact the billing team to receive an updated payment link.
        </p>
      </div>
    );
  }

  const tenant = invoice.tenant || {};
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Top Brand Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {tenant.name?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="font-bold text-sm text-white">{tenant.name || 'Vendor'}</div>
              <div className="text-[10px] text-slate-400 font-mono">
                GSTIN: {tenant.gstin || '27AABCU9603R1ZM'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Tax Invoice PDF</span>
            </button>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                Tax Invoice
              </span>
              <h1 className="text-2xl font-extrabold text-white font-mono mt-0.5">
                {invoice.number}
              </h1>
              <div className="text-xs text-slate-400 mt-1">
                Issued on {formatDate(invoice.issueDate)} • Due by {formatDate(invoice.dueDate)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Balance Due</span>
              <div className="text-3xl font-extrabold font-mono text-white mt-0.5">
                {isPaid ? (
                  <span className="text-emerald-400">PAID IN FULL</span>
                ) : (
                  formatInr(invoice.balanceDue)
                )}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Total Invoice Amount: {formatInr(invoice.total)}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Billed By:</span>
              <div className="font-bold text-white">{tenant.name}</div>
              <div className="text-slate-400">{tenant.addressLine1}</div>
              <div className="text-slate-400">
                {tenant.city}, {tenant.state} - {tenant.pincode}
              </div>
              <div className="text-slate-400 font-mono pt-1">GSTIN: {tenant.gstin}</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 font-semibold uppercase text-[10px]">Billed To:</span>
              <div className="font-bold text-white">{invoice.client?.name}</div>
              <div className="text-slate-400">
                {invoice.client?.addressLine1 || invoice.client?.city || 'Registered Client'}
              </div>
              <div className="text-slate-400 font-mono pt-1">
                GSTIN: {invoice.client?.gstin || 'Unregistered'}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">HSN/SAC</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {invoice.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-3 px-3 text-white font-semibold">{item.description}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{item.hsnSac || '—'}</td>
                    <td className="py-3 px-3 font-mono">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-3 font-mono">{formatInr(item.unitPrice)}</td>
                    <td className="py-3 px-3 font-mono text-white text-right font-bold">
                      {formatInr(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex justify-end font-mono text-xs">
            <div className="w-64 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Taxable Value:</span>
                <span className="text-white">{formatInr(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.cgst || '0') > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>CGST:</span>
                  <span className="text-indigo-400">{formatInr(invoice.cgst)}</span>
                </div>
              )}
              {parseFloat(invoice.sgst || '0') > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>SGST:</span>
                  <span className="text-indigo-400">{formatInr(invoice.sgst)}</span>
                </div>
              )}
              {parseFloat(invoice.igst || '0') > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>IGST:</span>
                  <span className="text-amber-400">{formatInr(invoice.igst)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="text-indigo-400">{formatInr(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Bank Remittance Details */}
          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>Remittance & Payment Coordinates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans">Beneficiary Name:</span>{' '}
                <span className="text-white font-semibold">
                  {tenant.bankAccountName || tenant.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Bank:</span>{' '}
                <span className="text-white font-semibold">{tenant.bankName || 'HDFC Bank'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">Account Number:</span>{' '}
                <span className="text-white font-bold tracking-wider">
                  {tenant.accountNumber || '50200012345678'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-sans">IFSC Code:</span>{' '}
                <span className="text-white font-bold">{tenant.ifscCode || 'HDFC0000060'}</span>
              </div>
              {tenant.upiId && (
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-sans">UPI VPA:</span>{' '}
                  <span className="text-indigo-300 font-bold">{tenant.upiId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Debtor Interactive Actions */}
          {!isPaid && (
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Accounts Payable Quick Responses
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={acknowledged || actionLoading}
                  onClick={handleAcknowledge}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition text-left flex items-start gap-2.5 disabled:opacity-50"
                >
                  <CheckCircle2
                    className={`w-4 h-4 mt-0.5 ${acknowledged ? 'text-emerald-400' : 'text-slate-400'}`}
                  />
                  <div>
                    <div className="text-xs font-bold text-white">
                      {acknowledged ? 'Receipt Confirmed' : 'Acknowledge Receipt'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Confirms bill is with AP team
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('PROMISE')}
                  className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 hover:bg-indigo-600/20 transition text-left flex items-start gap-2.5"
                >
                  <Calendar className="w-4 h-4 text-indigo-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-indigo-300">I will pay on [Date]</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Schedules payment & pauses cadence
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModal('DISPUTE')}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition text-left flex items-start gap-2.5"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-white">I have a question</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Inquire on hours, rates, or items
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-500">
          Powered by PNX Flow • B2B Invoicing & Instant Collections Architecture
        </div>
      </div>

      {/* PROMISE MODAL */}
      {activeModal === 'PROMISE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Schedule Payment Date</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handlePromiseToPay} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expected Payment Release Date *
                </label>
                <input
                  type="date"
                  required
                  value={promiseDate}
                  onChange={(e) => setPromiseDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarks / Payment Mode
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled in our Friday RTGS batch"
                  value={promiseNotes}
                  onChange={(e) => setPromiseNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Confirm Scheduled Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {activeModal === 'DISPUTE' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Submit Inquiry or Billing Question</span>
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Question / Discrepancy Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={disputeMessage}
                  onChange={(e) => setDisputeMessage(e.target.value)}
                  placeholder="e.g. Please clarify milestone deliverables on line item 2 before we release payment."
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Your Work Email for Response
                </label>
                <input
                  type="email"
                  placeholder="accounts@buyercompany.com"
                  value={disputeEmail}
                  onChange={(e) => setDisputeEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Send Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
