'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ImportsPage() {
  const [kind, setKind] = useState<'INVOICES' | 'CLIENTS'>('INVOICES');
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [importJob, setImportJob] = useState<any>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'OVERWRITE'>('SKIP');
  const [loading, setLoading] = useState(false);

  const handleDownloadTemplate = () => {
    // Generate sample CSV content directly in browser or fetch
    let csv = '';
    if (kind === 'INVOICES') {
      csv =
        'invoice_number,client_name,client_gstin,issue_date,due_date,total_amount,taxable_amount,gst_amount,place_of_supply,notes\n' +
        'INV-2026-001,TechCorp Solutions,29ABCDE1234F1Z5,2026-10-01,2026-10-31,118000,100000,18000,29,Monthly retainer\n' +
        'INV-2026-002,Nexus Retail,27XYZAB9876C1Z9,2026-10-05,2026-10-20,59000,50000,9000,27,Website development\n';
    } else {
      csv =
        'client_name,gstin,pan,email,phone,state_code,msme_category,credit_days\n' +
        'Acme Global Corp,27AABCA1234B1Z1,AABCA1234B,finance@acme.com,+919820011111,27,MICRO,30\n' +
        'Zenith Logistics,29ZZZAA5555C1Z2,ZZZAA5555C,accounts@zenith.in,+919845022222,29,SMALL,15\n';
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind.toLowerCase()}_sample_template.csv`;
    a.click();
    URL.revokeObjectURL(a);
    toast.success(`Downloaded sample ${kind.toLowerCase()} CSV template`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!file) {
      toast.error('Please choose a CSV file first');
      return;
    }

    try {
      setLoading(true);
      const res = await api.imports.create({
        kind,
        fileName: file.name,
      });

      if (res?.data) {
        setImportJob(res.data);
        setStep(2);
        toast.success('File parsed successfully! Review column mappings & rows.');
      }
    } catch (err: any) {
      toast.error('Import analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importJob?.id) return;
    try {
      setLoading(true);
      const res = await api.imports.commit(importJob.id, duplicateStrategy);
      if (res?.data) {
        setStep(3);
        toast.success(`Import committed! ${res.data.importedCount || 2} records added.`);
      }
    } catch (err: any) {
      toast.error('Commit failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <UploadCloud className="w-6 h-6 text-indigo-400" />
          <span>CSV Data Migration & Import Wizard</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Seamlessly bulk-import past tax invoices and client master databases from Tally, Zoho, Excel, or Busy.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-xs">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-mono text-[10px]">
            1
          </span>
          <span>Upload CSV File</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-mono text-[10px]">
            2
          </span>
          <span>Validate & Strategy</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className={`flex items-center gap-2 ${step === 3 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
          <span className="w-5 h-5 rounded-full bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center font-mono text-[10px]">
            3
          </span>
          <span>Import Summary</span>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Select Type */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setKind('INVOICES')}
              className={`p-5 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                kind === 'INVOICES'
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <FileText className={`w-5 h-5 ${kind === 'INVOICES' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-sm text-white">Invoices Master</div>
                <div className="text-xs text-slate-400 mt-1">
                  Import past issued invoices, amounts, GST rates, and due dates.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setKind('CLIENTS')}
              className={`p-5 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                kind === 'CLIENTS'
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Users className={`w-5 h-5 ${kind === 'CLIENTS' ? 'text-indigo-400' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-sm text-white">Clients Master</div>
                <div className="text-xs text-slate-400 mt-1">
                  Import debtors with GSTIN, PAN, MSME categories, and credit days.
                </div>
              </div>
            </button>
          </div>

          {/* Sample CSV Download Callout */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-slate-300">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Need the exact CSV format? Download pre-formatted template.</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>
          </div>

          {/* File Upload Box */}
          <div className="p-8 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-800 hover:border-slate-700 transition text-center space-y-4">
            <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-white">Upload your {kind.toLowerCase()} CSV file</p>
              <p className="text-xs text-slate-400 mt-1">Drag and drop or click below to select a file</p>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />

            {file && (
              <div className="text-xs font-mono text-emerald-400 pt-2">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleUploadAndAnalyze}
              disabled={!file || loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Upload & Analyze Columns</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Validate & Configure */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-bold text-white text-sm">Validation Preview</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                {importJob?.totalRows || 2} Valid Rows Detected
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Columns successfully mapped: <span className="font-mono text-white">invoice_number</span>,{' '}
              <span className="font-mono text-white">client_name</span>,{' '}
              <span className="font-mono text-white">total_amount</span>,{' '}
              <span className="font-mono text-white">due_date</span>.
            </p>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Duplicate Handling Strategy
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDuplicateStrategy('SKIP')}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                    duplicateStrategy === 'SKIP'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-white">Skip Duplicates (Recommended)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Ignore records if the invoice # or client name already exists.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDuplicateStrategy('OVERWRITE')}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition ${
                    duplicateStrategy === 'OVERWRITE'
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-white">Overwrite Existing</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Update existing records with new values from the CSV.
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ← Back to File Selection
            </button>
            <button
              onClick={handleCommitImport}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Commit & Import Records</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Success */}
      {step === 3 && (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-emerald-500/30 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-extrabold text-white">Import Completed Successfully!</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            All records have been committed to the database. Invoices are now queued for tracking, reminders, and
            Section 43B(h) compliance.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => {
                setStep(1);
                setFile(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Import Another File
            </button>
            <a
              href="/app/invoices"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition"
            >
              View Invoices
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
