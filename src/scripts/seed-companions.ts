import { CompanionService } from '@/lib/companions';

async function seedCompanions() {
  try {
    console.log('🌱 Starting to seed AI companions...');
    await CompanionService.seedDefaultCompanions();
    console.log('✅ AI companions seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding AI companions:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedCompanions();
}

export default seedCompanions;

