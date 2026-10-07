'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarCheck,
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  BellRing,
  BarChart3,
  UploadCloud,
  Settings,
  Plus,
  Search,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

const navItems = [
  { name: 'Today (Actions)', href: '/app/today', icon: CalendarCheck, badge: '2 to approve' },
  { name: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/app/invoices', icon: FileText },
  { name: 'Clients', href: '/app/clients', icon: Users },
  { name: 'Payments', href: '/app/payments', icon: CreditCard },
  { name: 'Reminders Queue', href: '/app/reminders', icon: BellRing },
  { name: 'Reports & 43B(h)', href: '/app/reports', icon: BarChart3 },
  { name: 'Imports', href: '/app/imports', icon: UploadCloud },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ clients: any[]; invoices: any[]; payments: any[] }>({
    clients: [],
    invoices: [],
    payments: [],
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch notifications
  useEffect(() => {
    api.notifications.list().then((res) => {
      if (res?.data) setNotifications(res.data);
    }).catch(() => {});
  }, []);

  // Handle Search input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ clients: [], invoices: [], payments: [] });
      return;
    }
    const timer = setTimeout(() => {
      api.search.query(searchQuery).then((res) => {
        if (res?.data) setSearchResults(res.data);
      }).catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex flex-col justify-between fixed top-0 bottom-0 left-0 z-30">
        <div>
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/60">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="font-extrabold text-white text-lg tracking-wider">P</span>
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                PNX <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono">FLOW</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">B2B Invoice & Collections</p>
            </div>
          </div>

          {/* Quick CTA */}
          <div className="p-4">
            <Link
              href="/app/invoices/new"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition font-medium text-sm text-white shadow-md shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Invoice</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full font-mono border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tenant Profile Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900/50 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
              AC
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">Acme Cloud Studio</p>
              <p className="text-[11px] text-slate-400 truncate">Maharashtra • 27AABCA1234F</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl sticky top-0 z-20 px-8 flex items-center justify-between">
          {/* Search Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-3 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs w-72 transition"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="flex-1 text-left">Search invoices, clients...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Right Header items */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((prev) => !prev)}
                className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
              >
                <Bell className="w-4 h-4" />
                {notifications.some((n) => !n.readAt) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#090d16]" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-200">Notifications</span>
                    <button
                      onClick={() => {
                        api.notifications.readAll();
                        setNotifications((list) => list.map((n) => ({ ...n, readAt: new Date().toISOString() })));
                      }}
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs">
                        <div className="font-medium text-slate-200">{n.title}</div>
                        <div className="text-slate-400 mt-0.5 text-[11px]">{n.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                RS
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-medium text-slate-200">Rahul Sharma</p>
                <p className="text-[10px] text-emerald-400 font-mono">Owner • Admin</p>
              </div>
              <Link
                href="/login"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8">{children}</main>
      </div>

      {/* ⌘K Command Palette Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-indigo-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoices, clients, or payments..."
                className="flex-1 bg-transparent border-0 outline-none text-slate-100 placeholder-slate-500 text-sm"
              />
              <button onClick={() => setSearchOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {/* Clients Results */}
              {searchResults.clients.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Clients</h4>
                  <div className="space-y-1">
                    {searchResults.clients.map((c: any) => (
                      <Link
                        key={c.id}
                        href={c.link}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/80 transition"
                      >
                        <span className="text-sm font-medium text-slate-200">{c.title}</span>
                        <span className="text-xs text-slate-400 font-mono">{c.subtitle}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices Results */}
              {searchResults.invoices.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Invoices</h4>
                  <div className="space-y-1">
                    {searchResults.invoices.map((inv: any) => (
                      <Link
                        key={inv.id}
                        href={inv.link}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/80 transition"
                      >
                        <span className="text-sm font-medium text-indigo-300">{inv.title}</span>
                        <span className="text-xs text-slate-400">{inv.subtitle}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments Results */}
              {searchResults.payments.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Payments</h4>
                  <div className="space-y-1">
                    {searchResults.payments.map((p: any) => (
                      <Link
                        key={p.id}
                        href={p.link}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-800/80 transition"
                      >
                        <span className="text-sm font-medium text-emerald-300">{p.title}</span>
                        <span className="text-xs text-slate-400">{p.subtitle}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery &&
                searchResults.clients.length === 0 &&
                searchResults.invoices.length === 0 &&
                searchResults.payments.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-500">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                )}

              {!searchQuery && (
                <div className="text-center py-6 text-xs text-slate-500">
                  Type a client name, invoice number (e.g. INV/2026-27/0101), or payment reference.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
