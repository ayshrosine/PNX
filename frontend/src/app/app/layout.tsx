import React from 'react';
import { AppShell } from '@/components/layout/AppShell';

export const metadata = {
  title: 'Workspace | PNX Flow',
  description: 'B2B Invoicing, GST Compliance & Collections Command Centre',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
