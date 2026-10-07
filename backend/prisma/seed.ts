import { PrismaClient } from '@prisma/client';
import { getInitialSeedData } from '../src/db/seed-data.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seeding for PNX...');
  const seed = getInitialSeedData();

  // 1. Seed Plans
  for (const plan of seed.plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {},
      create: {
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        invoiceLimit: plan.invoiceLimit,
        seatLimit: plan.seatLimit,
        features: plan.features,
        isActive: plan.isActive,
      },
    });
  }

  // 2. Seed Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: seed.tenant.id },
    update: {},
    create: {
      id: seed.tenant.id,
      name: seed.tenant.name,
      legalName: seed.tenant.legalName,
      slug: seed.tenant.slug,
      status: seed.tenant.status as any,
      gstin: seed.tenant.gstin,
      pan: seed.tenant.pan,
      stateCode: seed.tenant.stateCode,
      state: seed.tenant.state,
      city: seed.tenant.city,
      addressLine1: seed.tenant.addressLine1,
      pincode: seed.tenant.pincode,
      email: seed.tenant.email,
      phone: seed.tenant.phone,
      bankName: seed.tenant.bankName,
      bankAccountName: seed.tenant.bankAccountName,
      bankAccountLast4: seed.tenant.bankAccountLast4,
      bankIfsc: seed.tenant.bankIfsc,
      upiId: seed.tenant.upiId,
      onboardingStep: 'done',
    },
  });

  // 3. Seed Users & Memberships
  for (const user of seed.users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        locale: user.locale,
      },
    });
  }

  for (const mem of seed.memberships) {
    await prisma.membership.upsert({
      where: { id: mem.id },
      update: {},
      create: {
        id: mem.id,
        tenantId: mem.tenantId,
        userId: mem.userId,
        role: mem.role as any,
        status: mem.status as any,
        canApprove: mem.canApprove,
      },
    });
  }

  // 4. Seed Invoice Series
  for (const s of seed.series) {
    await prisma.invoiceSeries.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        tenantId: s.tenantId,
        name: s.name,
        prefix: s.prefix,
        suffix: s.suffix,
        fiscalYear: s.fiscalYear,
        nextNumber: s.nextNumber,
        padding: s.padding,
        isDefault: s.isDefault,
        isActive: s.isActive,
      },
    });
  }

  // 5. Seed Clients & Contacts
  for (const client of seed.clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {},
      create: {
        id: client.id,
        tenantId: client.tenantId,
        name: client.name,
        displayName: client.displayName,
        code: client.code,
        gstin: client.gstin,
        pan: client.pan,
        msmeClass: client.msmeClass as any,
        paymentTermsDays: client.paymentTermsDays,
        addressLine1: client.addressLine1,
        city: client.city,
        state: client.state,
        stateCode: client.stateCode,
        pincode: client.pincode,
        reminderTone: client.reminderTone as any,
        creditLimit: client.creditLimit,
        notes: client.notes,
        tags: client.tags,
      },
    });
  }

  for (const ct of seed.contacts) {
    await prisma.contact.upsert({
      where: { id: ct.id },
      update: {},
      create: {
        id: ct.id,
        tenantId: ct.tenantId,
        clientId: ct.clientId,
        name: ct.name,
        designation: ct.designation,
        email: ct.email,
        phone: ct.phone,
        whatsappNumber: ct.whatsappNumber,
        isPrimary: ct.isPrimary,
        isBilling: ct.isBilling,
        consentEmail: ct.consentEmail,
        consentWhatsapp: ct.consentWhatsapp,
      },
    });
  }

  // 6. Seed Invoices & Items
  for (const inv of seed.invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        tenantId: inv.tenantId,
        clientId: inv.clientId,
        seriesId: inv.seriesId,
        number: inv.number,
        status: inv.status as any,
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        currency: inv.currency,
        placeOfSupply: inv.placeOfSupply,
        poNumber: inv.poNumber,
        reference: inv.reference,
        subtotal: inv.subtotal,
        discountTotal: inv.discountTotal,
        taxableAmount: inv.taxableAmount,
        cgst: inv.cgst,
        sgst: inv.sgst,
        igst: inv.igst,
        taxTotal: inv.taxTotal,
        roundOff: inv.roundOff,
        total: inv.total,
        amountPaid: inv.amountPaid,
        balanceDue: inv.balanceDue,
        notes: inv.notes,
        terms: inv.terms,
        publicToken: inv.publicToken,
        sentAt: inv.sentAt ? new Date(inv.sentAt) : null,
        paidAt: (inv as any).paidAt ? new Date((inv as any).paidAt) : null,
        items: {
          create: inv.items.map((it: any) => ({
            id: it.id,
            tenantId: it.tenantId,
            position: it.position,
            description: it.description,
            hsnSac: it.hsnSac,
            quantity: it.quantity,
            unit: it.unit,
            rate: it.rate,
            taxRate: it.taxRate,
            taxableAmount: it.taxableAmount,
            taxAmount: it.taxAmount,
            lineTotal: it.lineTotal,
          })),
        },
      },
    });
  }

  console.log('✅ Prisma database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
