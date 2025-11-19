/**
 * Assign each student to exactly 2 teams
 * Usage: node assign_two_teams.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/userModel');
const Team = require('./models/teamModel');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/exq_db';
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('MongoDB connected:', mongoUri);

  try {
    const students = await User.find({ role: 'student' });
    const teams = await Team.find().lean();

    if (!teams || teams.length === 0) {
      console.log('No teams found. Exiting.');
      return;
    }

    let updated = 0;

    // Build a mutable map of teams with current member counts and capacity
    const teamMap = {};
    for (const t of teams) {
      teamMap[t._id] = {
        id: t._id,
        name: t.name,
        members: (t.members || []).slice(),
        maxMembers: t.maxMembers || 4
      };
    }

    for (const student of students) {
      // If student already has 2 or more teams, skip
      if (Array.isArray(student.teams) && student.teams.length >= 2) {
        console.log(`- Skipping ${student.email}, already in ${student.teams.length} teams`);
        continue;
      }

      // Find up to 2 available teams for this student
      const available = Object.values(teamMap).filter(t => t.members.length < t.maxMembers);
      // Shuffle available list
      for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
      }

      const twoTeams = [];
      for (const t of available) {
        if (twoTeams.length >= 2) break;
        // ensure we don't add the same team twice
        if (!twoTeams.find(x => x.id.toString() === t.id.toString())) {
          twoTeams.push(t);
        }
      }

      // If not enough available teams, pick from all teams but avoid overflow
      if (twoTeams.length < 2) {
        const fallback = Object.values(teamMap).sort((a,b) => a.members.length - b.members.length);
        for (const t of fallback) {
          if (twoTeams.length >= 2) break;
          if (!twoTeams.find(x => x.id.toString() === t.id.toString()) && t.members.length < t.maxMembers) {
            twoTeams.push(t);
          }
        }
      }

      // Persist assignments
      const assignedTeams = [];
      for (const t of twoTeams) {
        // Update team members only if slot available
        if (t.members.length < t.maxMembers) {
          await Team.updateOne({ _id: t.id }, { $addToSet: { members: student._id } });
          // reflect change in map
          t.members.push(student._id);
          assignedTeams.push(t.id);
        }
      }

      if (assignedTeams.length > 0) {
        // Add to user's teams array (avoid overwriting existing teams)
        await User.updateOne({ _id: student._id }, { $addToSet: { teams: { $each: assignedTeams } } });
        updated++;
        console.log(`✓ ${student.email} assigned to: ${assignedTeams.length ? assignedTeams.join(',') : 'none'}`);
      } else {
        console.log(`⚠ ${student.email} could not be assigned (no capacity)`);
      }
    }

    console.log(`\n✅ Done. Updated ${updated} students with 2 teams each.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();
