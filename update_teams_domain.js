/**
 * Update existing teams with domain field
 * Usage: node update_teams_domain.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Team = require('./models/teamModel');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exq_db';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected');

  try {
    const teamDomainMap = {
      'CodeMasters': 'Data Structures',
      'WebDevelopers': 'Web Development',
      'AI Innovators': 'Machine Learning',
      'Data Wizards': 'Database Design',
      'Cloud Architects': 'Cloud Computing',
      'Mobile Masters': 'Mobile Development',
      'DevOps Engineers': 'DevOps',
      'Blockchain Builders': 'Blockchain',
      'ML Experts': 'Machine Learning',
      'Cyber Guardians': 'Cybersecurity',
      'Security Squad': 'Web Security',
      'API Architects': 'API Design'
    };

    let updated = 0;
    for (const [teamName, domain] of Object.entries(teamDomainMap)) {
      const result = await Team.updateOne(
        { name: teamName },
        { $set: { domain: domain } }
      );
      if (result.modifiedCount > 0) {
        console.log(`✓ Updated ${teamName} → ${domain}`);
        updated++;
      } else if (result.matchedCount > 0) {
        console.log(`ℹ ${teamName} already has domain (or matched but no change)`);
      }
    }

    console.log(`\n✅ Done. Updated ${updated} teams with domains.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();
