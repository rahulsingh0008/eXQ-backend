/**
 * Assign unassigned student users to existing teams.
 * Usage: node assign_students_to_teams.js
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

    // Build mutable team map with current member counts
    const teamMap = {};
    for (const t of teams) {
      teamMap[t._id] = { id: t._id, name: t.name, members: (t.members || []).slice(), maxMembers: t.maxMembers || 4 };
    }

    let assigned = 0;
    let already = 0;

    // Helper to find a team with available slot
    function findAvailableTeam() {
      // Prefer teams with available slots
      for (const key of Object.keys(teamMap)) {
        if (teamMap[key].members.length < teamMap[key].maxMembers) return teamMap[key];
      }
      // Otherwise return team with smallest members to balance
      const sorted = Object.values(teamMap).sort((a,b) => a.members.length - b.members.length);
      return sorted[0];
    }

    for (const s of students) {
      // If user already has any teams, skip
      if (Array.isArray(s.teams) && s.teams.length > 0) {
        already++;
        continue;
      }

      const teamToUse = findAvailableTeam();
      if (!teamToUse) {
        console.warn('No team available for student', s.email);
        continue;
      }

      // Update team members array in-memory
      teamToUse.members.push(s._id);

      // Persist changes: update Team members only if there's capacity
      if (teamToUse.members.length <= teamToUse.maxMembers) {
        await Team.updateOne({ _id: teamToUse.id }, { $addToSet: { members: s._id } });
        // Add team to user's teams array
        await User.updateOne({ _id: s._id }, { $addToSet: { teams: teamToUse.id } });
        assigned++;
        console.log(`Assigned ${s.email} -> ${teamToUse.name}`);
      } else {
        console.warn(`Skipped persisting ${s.email} -> ${teamToUse.name} (would exceed capacity)`);
      }
    }

    console.log(`Done. Assigned: ${assigned}. Already had team: ${already}. Total students processed: ${students.length}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

main();
