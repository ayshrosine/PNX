'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Building,
  CreditCard,
  Sparkles,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatInr } from '@/lib/utils';
import { toast } from 'sonner';

interface LineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  gstRate: number; // e.g. 18 for 18%
}

const INDIAN_STATES = [
  { code: '27', name: 'Maharashtra (27)' },
  { code: '29', name: 'Karnataka (29)' },
  { code: '07', name: 'Delhi (07)' },
  { code: '33', name: 'Tamil Nadu (33)' },
  { code: '36', name: 'Telangana (36)' },
  { code: '24', name: 'Gujarat (24)' },
  { code: '19', name: 'West Bengal (19)' },
  { code: '06', name: 'Haryana (06)' },
  { code: '09', name: 'Uttar Pradesh (09)' },
  { code: '08', name: 'Rajasthan (08)' },
];

export default function NewInvoicePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  // Form State
  const [clientId, setClientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [placeOfSupply, setPlaceOfSupply] = useState('27');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('Payment is due within agreed terms. Remit via NEFT/RTGS or UPI.');

  // Line items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Monthly Engineering & Cloud Infrastructure Retainer',
      hsnSac: '998314',
      quantity: 1,
      unit: 'MONTH',
      unitPrice: 100000,
      discount: 0,
      gstRate: 18,
    },
  ]);

  // Load client list, tenant info, and next invoice number
  useEffect(() => {
    Promise.all([
      api.clients.list(),
      api.tenant.get(),
      api.invoices.getNextNumber().catch(() => ({ data: { nextNumber: 'INV-2026-0001' } })),
    ]).then(([clientsRes, tenantRes, numRes]) => {
      if (clientsRes?.data) setClients(clientsRes.data);
      if (tenantRes?.data) setTenant(tenantRes.data);
      if (numRes?.data?.nextNumber) setInvoiceNumber(numRes.data.nextNumber);
    });
  }, []);

  // Set default client if available
  useEffect(() => {
    if (clients.length > 0 && !clientId) {
      setClientId(clients[0].id);
      if (clients[0].stateCode) {
        setPlaceOfSupply(clients[0].stateCode);
      }
    }
  }, [clients, clientId]);

  // Whenever client changes, update place of supply from client profile
  const handleClientChange = (cId: string) => {
    setClientId(cId);
    const selected = clients.find((c) => c.id === cId);
    if (selected?.stateCode) {
      setPlaceOfSupply(selected.stateCode);
    }
  };

  // Helper date buttons
  const setQuickDueDays = (days: number) => {
    const base = new Date(issueDate);
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().split('T')[0]);
  };

  // Item manipulations
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        description: '',
        hsnSac: '998314',
        quantity: 1,
        unit: 'HRS',
        unitPrice: 0,
        discount: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Invoice must contain at least one line item');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LineItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Live GST Calculations
  const sellerStateCode = tenant?.stateCode || '27';
  const isInterState = placeOfSupply !== sellerStateCode;

  let subtotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  items.forEach((item) => {
    const taxable = Math.max(0, item.quantity * item.unitPrice - item.discount);
    subtotal += taxable;
    const rate = item.gstRate / 100;
    if (isInterState) {
      totalIgst += taxable * rate;
    } else {
      totalCgst += taxable * (rate / 2);
      totalSgst += taxable * (rate / 2);
    }
  });

  const totalGst = isInterState ? totalIgst : totalCgst + totalSgst;
  const rawTotal = subtotal + totalGst;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Number((roundedTotal - rawTotal).toFixed(2));

  // Convert number to basic Indian words preview
  const getAmountInWords = (num: number) => {
    return `Rupees ${num.toLocaleString('en-IN')} Only`;
  };

  const handleSaveInvoice = async (issueNow: boolean) => {
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }
    if (items.some((i) => !i.description.trim() || i.unitPrice <= 0)) {
      toast.error('Please fill description and unit price for all items');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        clientId,
        number: invoiceNumber,
        issueDate,
        dueDate,
        placeOfSupply,
        poNumber: poNumber || undefined,
        notes,
        status: issueNow ? 'SENT' : 'DRAFT',
        items: items.map((item) => ({
          description: item.description,
          hsnSac: item.hsnSac,
          quantity: Number(item.quantity),
          unit: item.unit,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount || 0),
          gstRate: Number(item.gstRate),
        })),
      };

      const res = await api.invoices.create(payload);
      if (res?.data) {
        toast.success(
          issueNow
            ? 'Invoice issued and ready for dispatch!'
            : 'Draft invoice saved successfully!'
        );
        router.push(`/app/invoices/${res.data.id}`);
      }
    } catch (err: any) {
      toast.error('Failed to save invoice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/app/invoices"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Create Tax Invoice</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                GST COMPLIANT
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated CGST/SGST vs IGST detection based on Place of Supply.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSaveInvoice(false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSaveInvoice(true)}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Issue & Open</span>
          </button>
        </div>
      </div>

      {/* Invoice Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client Selection */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Client / Billed To *
          </label>
          <select
            value={clientId}
            onChange={(e) => handleClientChange(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.gstin ? `(${c.gstin})` : ''}
              </option>
            ))}
          </select>

          {clientId && (
            <div className="text-[11px] text-slate-400 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 space-y-1">
              <div>
                <span className="text-slate-500">GSTIN:</span>{' '}
                <span className="text-slate-200 font-mono">
                  {clients.find((c) => c.id === clientId)?.gstin || 'Unregistered'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">State:</span>{' '}
                <span className="text-slate-200">
                  {clients.find((c) => c.id === clientId)?.stateCode || '27'} -{' '}
                  {clients.find((c) => c.id === clientId)?.state || 'Maharashtra'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Identifiers */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Invoice Number *
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              PO / Reference Number
            </label>
            <input
              type="text"
              placeholder="e.g. PO-2026-99"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dates and POS */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Due presets */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-500">Terms:</span>
            <button
              type="button"
              onClick={() => setQuickDueDays(15)}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition"
            >
              +15d
            </button>
            <button
              type="button"
              onClick={() => setQuickDueDays(30)}
              className="px-2 py-0.5 text-[10px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition"
            >
              +30d
            </button>
            <button
              type="button"
              onClick={() => setQuickDueDays(45)}
              className="px-2 py-0.5 text-[10px] rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-mono transition"
              title="Section 43B(h) MSME maximum statutory cap"
            >
              +45d (MSME)
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Place of Supply (POS)
            </label>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[10px] font-mono">
              {isInterState ? (
                <span className="text-amber-400">Inter-State Supply → 100% IGST</span>
              ) : (
                <span className="text-indigo-400">Intra-State Supply → CGST (50%) + SGST (50%)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white tracking-tight">Line Items & Services</h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => {
            const lineTaxable = Math.max(0, item.quantity * item.unitPrice - item.discount);
            const lineTax = lineTaxable * (item.gstRate / 100);
            const lineTotal = lineTaxable + lineTax;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Description */}
                  <div className="md:col-span-5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Description of Service / Goods *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Software Development Retainer"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* HSN/SAC */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      HSN / SAC
                    </label>
                    <input
                      type="text"
                      placeholder="998314"
                      value={item.hsnSac}
                      onChange={(e) => handleItemChange(item.id, 'hsnSac', e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* Qty & Unit */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Qty & Unit
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                        className="w-16 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none uppercase"
                      />
                    </div>
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Rate / Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                      className="w-full p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 pt-6 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-row: GST Rate & Computed line total */}
                <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-900">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">GST Slab:</span>
                    {[0, 5, 12, 18, 28].map((rate) => (
                      <label
                        key={rate}
                        className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                          item.gstRate === rate
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`gst-${item.id}`}
                          value={rate}
                          checked={item.gstRate === rate}
                          onChange={() => handleItemChange(item.id, 'gstRate', rate)}
                          className="sr-only"
                        />
                        {rate}%
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                    <div>
                      Taxable: <span className="text-white">{formatInr(lineTaxable)}</span>
                    </div>
                    <div>
                      GST ({item.gstRate}%):{' '}
                      <span className="text-indigo-400">{formatInr(lineTax)}</span>
                    </div>
                    <div>
                      Item Total: <span className="text-white font-bold">{formatInr(lineTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculations & Totals Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notes & Bank Remittance Instructions */}
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            Remittance Notes & Payment Instructions
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          />

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              Bank details and UPI QR code configured in Settings will be dynamically embedded on the
              generated Tax Invoice PDF and client payment portal.
            </div>
          </div>
        </div>

        {/* GST Summary Block */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-3 font-mono">
          <div className="flex justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span>Taxable Subtotal</span>
            <span className="text-white">{formatInr(subtotal)}</span>
          </div>

          {!isInterState ? (
            <>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Central GST (CGST)</span>
                <span className="text-indigo-400">{formatInr(totalCgst)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>State GST (SGST)</span>
                <span className="text-indigo-400">{formatInr(totalSgst)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Integrated GST (IGST)</span>
              <span className="text-amber-400">{formatInr(totalIgst)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-slate-400">
            <span>Round Off Adjustment</span>
            <span className="text-slate-300">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
          </div>

          <div className="flex justify-between text-base font-bold text-white pt-3 border-t border-slate-800">
            <span>Grand Total (INR)</span>
            <span className="text-indigo-400 text-lg">{formatInr(roundedTotal)}</span>
          </div>

          <div className="text-[11px] font-sans text-slate-400 pt-1 italic">
            Amount in words: {getAmountInWords(roundedTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}
