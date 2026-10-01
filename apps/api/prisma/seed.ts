import "dotenv/config";
import { PrismaClient, ProviderStatus, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123!", 12);
  const providerPasswordHash = await bcrypt.hash("Provider123!", 12);

  await prisma.user.upsert({
    where: { email: "admin@ekub.local" },
    update: { passwordHash: adminPasswordHash, fullName: "Ekub Administrator", role: UserRole.ADMIN },
    create: { email: "admin@ekub.local", passwordHash: adminPasswordHash, fullName: "Ekub Administrator", role: UserRole.ADMIN },
  });

  const providerUser = await prisma.user.upsert({
    where: { email: "provider@ekub.local" },
    update: { passwordHash: providerPasswordHash, fullName: "Demo Provider", role: UserRole.PROVIDER },
    create: { email: "provider@ekub.local", passwordHash: providerPasswordHash, fullName: "Demo Provider", role: UserRole.PROVIDER },
  });

  const provider = await prisma.provider.upsert({
    where: { userId: providerUser.id },
    update: { displayName: "Demo Provider", phone: "+251911000001", status: ProviderStatus.APPROVED, verifiedAt: new Date() },
    create: { userId: providerUser.id, displayName: "Demo Provider", phone: "+251911000001", status: ProviderStatus.APPROVED, verifiedAt: new Date() },
  });

  const accounts = [
    { accountName: "Demo Provider", methodType: "Bank transfer", accountNumber: "100000000001", instructions: "Use the account number as the manual transfer destination.", isPrimary: true },
    { accountName: "Demo Provider", methodType: "Mobile transfer", accountNumber: "100000000002", instructions: "Send the transfer manually and include your ticket number.", isPrimary: false },
  ];

  for (const account of accounts) {
    const id = `${provider.id}-${account.methodType.toLowerCase().replaceAll(" ", "-")}`;
    await prisma.providerPaymentAccount.upsert({
      where: { id },
      update: account,
      create: { id, providerId: provider.id, ...account },
    });
  }

  const lottery = await prisma.lottery.upsert({
    where: { id: "demo-draft-lottery" },
    update: { providerId: provider.id, title: "Demo Ekub", description: "A draft lottery for local development.", size: 10, ticketPrice: 100, currency: "ETB", status: "DRAFT" },
    create: {
      id: "demo-draft-lottery",
      providerId: provider.id,
      title: "Demo Ekub",
      description: "A draft lottery for local development.",
      size: 10,
      ticketPrice: 100,
      currency: "ETB",
      status: "DRAFT",
    },
  });

  for (let lotNumber = 1; lotNumber <= lottery.size; lotNumber += 1) {
    await prisma.lot.upsert({
      where: { lotteryId_lotNumber: { lotteryId: lottery.id, lotNumber } },
      update: {},
      create: { lotteryId: lottery.id, lotNumber },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());