import 'dotenv/config';
import { prisma } from '@/core/db/prisma';

interface PromocodeSeedData {
  code: string;
  diamonds: number;
  energy: number;
  description: string | null;
  is_active: boolean;
  expires_at: Date | null;
  usage_limit: number | null;
}

const initialPromocodes: PromocodeSeedData[] = [
  // Active promocodes with both rewards
  {
    code: 'WELCOME100',
    diamonds: 100,
    energy: 100,
    description: 'Welcome bonus - 100 diamonds and 100 energy',
    is_active: true,
    expires_at: null, // Never expires
    usage_limit: null, // Unlimited usage
  },
  {
    code: 'LAUNCH50',
    diamonds: 50,
    energy: 50,
    description: 'Launch celebration - 50 diamonds and 50 energy',
    is_active: true,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    usage_limit: 1000, // Limited to 1000 uses
  },
  
  // Diamond-only promocodes
  {
    code: 'DIAMONDS200',
    diamonds: 200,
    energy: 0,
    description: '200 free diamonds',
    is_active: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
    usage_limit: 500,
  },
  {
    code: 'BONUS500',
    diamonds: 500,
    energy: 0,
    description: 'Big bonus - 500 diamonds',
    is_active: true,
    expires_at: null,
    usage_limit: 100, // Limited to 100 uses
  },
  
  // Energy-only promocodes
  {
    code: 'ENERGY150',
    diamonds: 0,
    energy: 150,
    description: '150 free energy',
    is_active: true,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Expires in 14 days
    usage_limit: null, // Unlimited usage
  },
  {
    code: 'POWER300',
    diamonds: 0,
    energy: 300,
    description: 'Power boost - 300 energy',
    is_active: true,
    expires_at: null,
    usage_limit: 200,
  },
  
  // Small rewards for testing
  {
    code: 'TEST10',
    diamonds: 10,
    energy: 10,
    description: 'Test promocode - 10 diamonds and 10 energy',
    is_active: true,
    expires_at: null,
    usage_limit: null,
  },
  
  // Inactive/expired promocodes (for testing edge cases)
  {
    code: 'EXPIRED',
    diamonds: 100,
    energy: 100,
    description: 'Expired promocode for testing',
    is_active: false,
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    usage_limit: null,
  },
  {
    code: 'OLDCODE',
    diamonds: 50,
    energy: 50,
    description: 'Old promocode that expired',
    is_active: true,
    expires_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Expired 7 days ago
    usage_limit: null,
  },
  
  // One-time use promocodes (usage_limit = 1)
  {
    code: 'ONETIME',
    diamonds: 1000,
    energy: 1000,
    description: 'One-time use promocode - big reward',
    is_active: true,
    expires_at: null,
    usage_limit: 1,
  },
];

async function seedPromocodes() {
  try {
    console.log('🌱 Starting to seed promocodes...');

    // Check if promocodes already exist
    const existingPromocodes = await prisma.promocodes.count();
    if (existingPromocodes > 0) {
      console.log(`⚠️  Found ${existingPromocodes} existing promocodes.`);
      console.log('   Clearing existing promocodes and their usages...');
      
      // Delete usages first (due to foreign key constraint)
      await prisma.promocodeUsage.deleteMany({});
      await prisma.promocodes.deleteMany({});
      console.log('   ✅ Existing promocodes cleared.');
    }

    // Create all promocodes
    console.log(`📦 Creating ${initialPromocodes.length} promocodes...`);
    
    for (const promocode of initialPromocodes) {
      await prisma.promocodes.create({
        data: {
          code: promocode.code,
          diamonds: promocode.diamonds,
          energy: promocode.energy,
          description: promocode.description,
          is_active: promocode.is_active,
          expires_at: promocode.expires_at,
          usage_limit: promocode.usage_limit,
        },
      });
      console.log(`   ✓ Created promocode: ${promocode.code} (${promocode.diamonds}💎 + ${promocode.energy}⚡)`);
    }

    // Verify seeding
    const createdPromocodes = await prisma.promocodes.count();
    console.log(`\n✅ Successfully seeded ${createdPromocodes} promocodes!`);

    // Display summary
    const activeCount = await prisma.promocodes.count({ where: { is_active: true } });
    const inactiveCount = await prisma.promocodes.count({ where: { is_active: false } });
    const unlimitedCount = await prisma.promocodes.count({ where: { usage_limit: null } });
    const expiredCount = await prisma.promocodes.count({
      where: {
        expires_at: {
          lt: new Date(),
        },
      },
    });

    console.log('\n📊 Summary:');
    console.log(`   Active promocodes: ${activeCount}`);
    console.log(`   Inactive promocodes: ${inactiveCount}`);
    console.log(`   Unlimited usage promocodes: ${unlimitedCount}`);
    console.log(`   Expired promocodes: ${expiredCount}`);
    
    // Show active promocodes
    const activePromocodes = await prisma.promocodes.findMany({
      where: { is_active: true },
      select: {
        code: true,
        diamonds: true,
        energy: true,
        expires_at: true,
        usage_limit: true,
      },
      orderBy: { code: 'asc' },
    });
    
    if (activePromocodes.length > 0) {
      console.log('\n🎟️  Active Promocodes:');
      activePromocodes.forEach((pc: { code: string; diamonds: number; energy: number; expires_at: Date | null; usage_limit: number | null }) => {
        const expires = pc.expires_at 
          ? `expires ${new Date(pc.expires_at).toLocaleDateString()}`
          : 'never expires';
        const limit = pc.usage_limit 
          ? `limit: ${pc.usage_limit} uses`
          : 'unlimited uses';
        console.log(`   • ${pc.code}: ${pc.diamonds}💎 + ${pc.energy}⚡ (${expires}, ${limit})`);
      });
    }
  } catch (error) {
    console.error('❌ Error seeding promocodes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedPromocodes()
    .then(() => {
      console.log('\n🎉 Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seed failed:', error);
      process.exit(1);
    });
}

export default seedPromocodes;

