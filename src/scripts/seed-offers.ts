import 'dotenv/config';
import { prisma } from '@/core/db/prisma';
import { OfferType } from '@prisma/client';

interface OfferSeedData {
  offer_type: OfferType;
  title: string;
  description: string | null;
  price_in_stars: number;
  price_in_usd: number;
  diamonds: number;
  energy: number;
  display_order: number;
  is_active: boolean;
}

const initialOffers: OfferSeedData[] = [
  // COMBO Offers - Full price (diamonds + energy)
  {
    offer_type: 'COMBO',
    title: 'Basic',
    description: '100 diamonds + 100 energy',
    price_in_stars: 10000, // $100 at 1 Star = $0.01
    price_in_usd: 100.0,
    diamonds: 100,
    energy: 100,
    display_order: 0,
    is_active: true,
  },
  {
    offer_type: 'COMBO',
    title: 'Standard',
    description: '250 diamonds + 250 energy',
    price_in_stars: 25000, // $250 at 1 Star = $0.01
    price_in_usd: 250.0,
    diamonds: 250,
    energy: 250,
    display_order: 1,
    is_active: true,
  },
  {
    offer_type: 'COMBO',
    title: 'Amateur',
    description: '500 diamonds + 500 energy',
    price_in_stars: 50000, // $500 at 1 Star = $0.01
    price_in_usd: 500.0,
    diamonds: 500,
    energy: 500,
    display_order: 2,
    is_active: true,
  },
  {
    offer_type: 'COMBO',
    title: 'Pro+',
    description: '1000 diamonds + 1000 energy',
    price_in_stars: 100000, // $1000 at 1 Star = $0.01
    price_in_usd: 1000.0,
    diamonds: 1000,
    energy: 1000,
    display_order: 3,
    is_active: true,
  },

  // ENERGY Offers - Half price (energy only)
  {
    offer_type: 'ENERGY',
    title: 'Basic',
    description: '100 energy',
    price_in_stars: 5000, // Half of COMBO price
    price_in_usd: 50.0,
    diamonds: 0,
    energy: 100,
    display_order: 0,
    is_active: true,
  },
  {
    offer_type: 'ENERGY',
    title: 'Standard',
    description: '250 energy',
    price_in_stars: 12500, // Half of COMBO price
    price_in_usd: 125.0,
    diamonds: 0,
    energy: 250,
    display_order: 1,
    is_active: true,
  },
  {
    offer_type: 'ENERGY',
    title: 'Amateur',
    description: '500 energy',
    price_in_stars: 25000, // Half of COMBO price
    price_in_usd: 250.0,
    diamonds: 0,
    energy: 500,
    display_order: 2,
    is_active: true,
  },
  {
    offer_type: 'ENERGY',
    title: 'Pro+',
    description: '1000 energy',
    price_in_stars: 50000, // Half of COMBO price
    price_in_usd: 500.0,
    diamonds: 0,
    energy: 1000,
    display_order: 3,
    is_active: true,
  },

  // DIAMOND Offers - Half price (diamonds only)
  {
    offer_type: 'DIAMOND',
    title: 'Basic',
    description: '100 diamonds',
    price_in_stars: 5000, // Half of COMBO price
    price_in_usd: 50.0,
    diamonds: 100,
    energy: 0,
    display_order: 0,
    is_active: true,
  },
  {
    offer_type: 'DIAMOND',
    title: 'Standard',
    description: '250 diamonds',
    price_in_stars: 12500, // Half of COMBO price
    price_in_usd: 125.0,
    diamonds: 250,
    energy: 0,
    display_order: 1,
    is_active: true,
  },
  {
    offer_type: 'DIAMOND',
    title: 'Amateur',
    description: '500 diamonds',
    price_in_stars: 25000, // Half of COMBO price
    price_in_usd: 250.0,
    diamonds: 500,
    energy: 0,
    display_order: 2,
    is_active: true,
  },
  {
    offer_type: 'DIAMOND',
    title: 'Pro+',
    description: '1000 diamonds',
    price_in_stars: 50000, // Half of COMBO price
    price_in_usd: 500.0,
    diamonds: 1000,
    energy: 0,
    display_order: 3,
    is_active: true,
  },
];

async function seedOffers() {
  try {
    console.log('🌱 Starting to seed offers...');

    // Check if offers already exist
    const existingOffers = await prisma.offers.count();
    if (existingOffers > 0) {
      console.log(`⚠️  Found ${existingOffers} existing offers.`);
      console.log('   Clearing existing offers...');
      await prisma.offers.deleteMany({});
      console.log('   ✅ Existing offers cleared.');
    }

    // Create all offers
    console.log(`📦 Creating ${initialOffers.length} offers...`);
    
    for (const offer of initialOffers) {
      await prisma.offers.create({
        data: {
          offer_type: offer.offer_type,
          title: offer.title,
          description: offer.description,
          price_in_stars: offer.price_in_stars,
          price_in_usd: offer.price_in_usd,
          diamonds: offer.diamonds,
          energy: offer.energy,
          display_order: offer.display_order,
          is_active: offer.is_active,
        },
      });
      console.log(`   ✓ Created ${offer.offer_type} - ${offer.title}`);
    }

    // Verify seeding
    const createdOffers = await prisma.offers.count();
    console.log(`\n✅ Successfully seeded ${createdOffers} offers!`);

    // Display summary
    const comboCount = await prisma.offers.count({ where: { offer_type: 'COMBO' } });
    const energyCount = await prisma.offers.count({ where: { offer_type: 'ENERGY' } });
    const diamondCount = await prisma.offers.count({ where: { offer_type: 'DIAMOND' } });

    console.log('\n📊 Summary:');
    console.log(`   COMBO offers: ${comboCount}`);
    console.log(`   ENERGY offers: ${energyCount}`);
    console.log(`   DIAMOND offers: ${diamondCount}`);
  } catch (error) {
    console.error('❌ Error seeding offers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedOffers()
    .then(() => {
      console.log('\n🎉 Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Seed failed:', error);
      process.exit(1);
    });
}

export default seedOffers;

