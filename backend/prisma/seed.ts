import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed feature flags
  const flags = [
    { name: 'automation.enabled', enabled: false, description: 'Enable Playwright browser automation for Seller Central' },
    { name: 'sp-api.enabled', enabled: false, description: 'Enable Amazon SP-API integration' },
    { name: 'experiment.live', enabled: false, description: 'Enable live experiment tracking (vs simulation)' },
    { name: 'llm.mock', enabled: false, description: 'Use mock LLM responses instead of OpenAI API' },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: {},
      create: flag,
    });
  }

  console.log('Seeded feature flags');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
