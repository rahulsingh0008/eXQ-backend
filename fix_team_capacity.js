/**
 * Fix script: Trim teams that exceed their `maxMembers`.
 * Usage: node fix_team_capacity.js
 *
 * Behavior:
 * - Finds teams where members.length > maxMembers
 * - Keeps the first `maxMembers` entries in `members` (preserves leader if already first)
 * - Removes excess member references from Team.members
 * - Removes the team id from each removed user's `teams` array
 * - Logs actions
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Team = require('./models/teamModel');
const User = require('./models/userModel');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exq_db';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected:', mongoUri);

  const dryRun = process.argv.includes('--dry-run') || process.env.DRY === 'true';
  if (dryRun) console.log('Running in dry-run mode: no writes will be performed');

  try {
    const teams = await Team.find();
    let fixedCount = 0;

    for (const team of teams) {
      const members = (team.members || []).map(m => m.toString());
      const max = team.maxMembers || 4;
      if (members.length > max) {
        console.log(`Team "${team.name}" has ${members.length}/${max} members — trimming extras`);

        // Ensure leader remains if present and is prioritized
        const leaderId = team.leader ? team.leader.toString() : null;
        let ordered = members.slice();
        if (leaderId) {
          // move leader to front
          ordered = ordered.filter(id => id !== leaderId);
          ordered.unshift(leaderId);
        }

        // Keep first `max` members
        const keep = ordered.slice(0, max);
        const remove = ordered.slice(max);

        if (dryRun) {
          console.log(` - Would keep: ${keep.join(', ')}`);
          console.log(` - Would remove: ${remove.join(', ')}`);
        } else {
          // Persist trimmed members array
          await Team.updateOne({ _id: team._id }, { $set: { members: keep } });

          // Remove team reference from removed users
          for (const userid of remove) {
            await User.updateOne({ _id: userid }, { $pull: { teams: team._id } });
            console.log(` - Removed user ${userid} from team ${team.name}`);
          }

          fixedCount++;
        }
      }
    }

    console.log(`\nDone. Fixed ${fixedCount} teams.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();
