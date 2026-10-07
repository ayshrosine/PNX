'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

function RecordPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialInvoiceId = searchParams.get('invoiceId') || '';
  const initialClientId = searchParams.get('clientId') || '';

  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState(initialClientId);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('NEFT');
  const [reference, setReference] = useState('');
  const [tdsDeducted, setTdsDeducted] = useState('0');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Invoices for selected client
  const [openInvoices, setOpenInvoices] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    api.clients.list().then((res) => {
      if (res?.data) {
        setClients(res.data);
        if (!clientId && res.data.length > 0) {
          setClientId(res.data[0].id);
        }
      }
    });
  }, []);

  // Fetch open invoices when clientId changes
  useEffect(() => {
    if (!clientId) {
      setOpenInvoices([]);
      setAllocations({});
      return;
    }

    api.invoices.list({ clientId }).then((res) => {
      if (res?.data) {
        // filter open or part paid
        const unpaid = res.data.filter(
          (inv: any) => ['SENT', 'PART_PAID'].includes(inv.status) && parseFloat(inv.balanceDue || '0') > 0
        );
        setOpenInvoices(unpaid);

        // If an initial invoice was targeted, pre-allocate
        if (initialInvoiceId) {
          const target = unpaid.find((i: any) => i.id === initialInvoiceId);
          if (target) {
            const bal = parseFloat(target.balanceDue || '0');
            setAmount(String(bal));
            setAllocations({ [target.id]: bal });
          }
        }
      }
    });
  }, [clientId, initialInvoiceId]);

  // Handle manual allocation change
  const handleAllocationChange = (invId: string, val: string) => {
    const num = parseFloat(val) || 0;
    setAllocations((prev) => ({
      ...prev,
      [invId]: num,
    }));
  };

  // FIFO Auto Allocate
  const handleAutoAllocate = () => {
    const payAmt = parseFloat(amount || '0');
    if (payAmt <= 0) {
      toast.error('Please enter payment amount first');
      return;
    }

    let remaining = payAmt;
    const newAlloc: Record<string, number> = {};

    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const bal = parseFloat(inv.balanceDue || '0');
      const allocated = Math.min(bal, remaining);
      newAlloc[inv.id] = allocated;
      remaining -= allocated;
    }

    setAllocations(newAlloc);
    toast.success('Distributed amount across oldest open invoices');
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  const enteredAmount = parseFloat(amount || '0');
  const unallocatedAmount = enteredAmount - totalAllocated;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (enteredAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }
    if (!reference.trim()) {
      toast.error('Please enter UTR / bank transaction reference');
      return;
    }

    try {
      setLoading(true);

      const allocationPayload = Object.entries(allocations)
        .filter(([_, amt]) => amt > 0)
        .map(([invoiceId, amt]) => ({
          invoiceId,
          amount: amt,
        }));

      await api.payments.record({
        clientId,
        amount: enteredAmount,
        paymentDate,
        mode,
        reference,
        tdsDeducted: parseFloat(tdsDeducted) || 0,
        notes: notes || undefined,
        allocations: allocationPayload,
      });

      toast.success('Payment recorded and allocated successfully!');
      router.push('/app/payments');
    } catch (err: any) {
      toast.error('Failed to record payment: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/app/payments"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-400" />
              <span>Record Client Remittance</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter bank remittance UTR and allocate funds to outstanding tax invoices.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Meta */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Client / Payer *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Payment Amount Received (₹) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="118000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Remittance Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              >
                <option value="NEFT">NEFT (National Electronic Fund Transfer)</option>
                <option value="RTGS">RTGS (Real Time Gross Settlement)</option>
                <option value="IMPS">IMPS (Immediate Payment Service)</option>
                <option value="UPI">UPI (Unified Payments Interface)</option>
                <option value="CHEQUE">Bank Cheque / DD</option>
                <option value="CASH">Cash Deposit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                UTR / Cheque / Bank Ref *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC202610079981"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                TDS Deducted by Buyer (₹)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={tdsDeducted}
                onChange={(e) => setTdsDeducted(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-amber-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Under Sec 194C/194J, buyer may deduct 2% or 10% TDS from gross amount.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks</label>
              <input
                type="text"
                placeholder="e.g. Advance settlement or part payment"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Invoice Allocation Section */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Allocate to Open Invoices
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Apply this remittance against specific invoices to update their balance due.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutoAllocate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition self-start"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto Allocate (FIFO)</span>
            </button>
          </div>

          {openInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Balance Due</th>
                    <th className="py-2.5 px-3 w-40 text-right">Allocate (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {openInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-400">
                        {inv.number}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{formatDate(inv.dueDate)}</td>
                      <td className="py-3 px-3 font-mono">{formatInr(inv.total)}</td>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {formatInr(inv.balanceDue)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={inv.balanceDue}
                          value={allocations[inv.id] || ''}
                          onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                          placeholder="0"
                          className="w-32 p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 text-right focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-6 text-center">
              No outstanding invoices found for this client.
            </p>
          )}

          {/* Allocation Balance bar */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Allocated: <span className="text-white font-bold">{formatInr(totalAllocated)}</span>
            </span>
            <span
              className={`font-bold ${
                unallocatedAmount === 0
                  ? 'text-emerald-400'
                  : unallocatedAmount > 0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {unallocatedAmount === 0
                ? '✓ Fully allocated'
                : unallocatedAmount > 0
                ? `₹${unallocatedAmount.toFixed(2)} unallocated (held as advance)`
                : `Over-allocated by ₹${Math.abs(unallocatedAmount).toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/app/payments"
            className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Record & Apply Remittance</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function RecordPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <RecordPaymentForm />
    </Suspense>
  );
}

