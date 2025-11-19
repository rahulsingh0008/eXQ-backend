require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/userModel');
const Team = require('./models/teamModel');
const Problem = require('./models/problemModel');
const Payment = require('./models/paymentModel');
const Chat = require('./models/chatModel');
const Feedback = require('./models/feedbackModel');
const Upvote = require('./models/upvoteModel');
const Downvote = require('./models/downvoteModel');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exq_db');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    // Append-only seed: this script will add missing demo data without deleting existing data.
    // (If you need a full reset, run manual cleanup or add logic here.)
    console.log('Appending seed entries — existing data will be preserved');

    // Helper: find or create user by email
    const findOrCreateUser = async (userData) => {
      let user = await User.findOne({ email: userData.email });
      if (user) return user;
      user = await User.create(userData);
      return user;
    };

    // Helper: find or create team by name
    const findOrCreateTeam = async (teamData) => {
      let t = await Team.findOne({ name: teamData.name });
      if (t) return t;
      t = await Team.create(teamData);
      return t;
    };

    // Helper: find or create problem by title
    const findOrCreateProblem = async (probData) => {
      let p = await Problem.findOne({ title: probData.title });
      if (p) return p;
      p = await Problem.create(probData);
      return p;
    };

    // Create admin user
    const admin = await findOrCreateUser({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      department: 'Administration'
    });
    console.log('✓ Admin ensured:', admin.email);

    // Create faculty users (4)
    const facultiesData = [
      { name: 'Prof. Rajesh Kumar', email: 'faculty1@test.com' },
      { name: 'Prof. Priya Sharma', email: 'faculty2@test.com' },
      { name: 'Prof. Karan Mehta', email: 'faculty3@test.com' },
      { name: 'Prof. Sangeeta Rao', email: 'faculty4@test.com' }
    ];

    const facultyUsers = [];
    for (const f of facultiesData) {
      const fu = await findOrCreateUser({
        name: f.name,
        email: f.email,
        password: 'password123',
        role: 'faculty',
        department: 'Computer Science'
      });
      facultyUsers.push(fu);
    }
    console.log('✓ Faculty users ensured');

    // Also load ALL faculty in the system (including any created via UI)
    const allFacultyUsers = await User.find({ role: 'faculty' });

    // Create remaining student users to reach total 21 users (1 admin + 4 faculty + 16 students)
    const totalUsersDesired = 21;
    const existingUsersCount = await User.countDocuments();
    const studentsToCreate = Math.max(0, totalUsersDesired - existingUsersCount);

    const students = [];
    // Create at least 16 students if not already present
    for (let i = 1; i <= 16; i++) {
      const email = `student${i}@test.com`;
      const s = await findOrCreateUser({
        name: `Student ${i}`,
        email,
        password: 'password123',
        role: 'student',
        rollNumber: `20210${('00' + i).slice(-3)}`,
        department: i <= 8 ? 'Computer Science' : 'Information Technology',
        year: (i % 4) + 1
      });
      students.push(s);
    }
    console.log('✓ Student users ensured');

    // Create 4 teams and distribute students
    const teamNames = ['CodeMasters','WebDevelopers','AI Innovators','Data Wizards'];
    const teamDomains = ['Data Structures', 'Web Development', 'Machine Learning', 'Database Design'];
    const teams = [];
    for (let i = 0; i < teamNames.length; i++) {
      const leader = students[i % students.length];
      const members = [leader._id, students[(i + 1) % students.length]._id, students[(i + 2) % students.length]._id];
      try {
        const t = await findOrCreateTeam({
          name: teamNames[i],
          description: `${teamNames[i]} working on projects`,
          leader: leader._id,
          members,
          maxMembers: 4,
          department: leader.department,
          domain: teamDomains[i]
        });
        teams.push(t);
      } catch (err) {
        // Skip if team already exists (or other error)
        console.warn(`⚠ Team "${teamNames[i]}" skipped:`, err.message);
        // Still try to fetch existing team by name
        const existing = await Team.findOne({ name: teamNames[i] });
        if (existing) teams.push(existing);
      }
    }
    console.log('✓ Teams ensured (4)');

    // Create 8 additional teams
    const additionalTeamNames = ['Cloud Architects','Mobile Masters','DevOps Engineers','Blockchain Builders','ML Experts','Cyber Guardians','Security Squad','API Architects'];
    const additionalDomains = ['Cloud Computing', 'Mobile Development', 'DevOps', 'Blockchain', 'Machine Learning', 'Cybersecurity', 'Web Security', 'API Design'];
    for (let i = 0; i < additionalTeamNames.length; i++) {
      try {
        const leader = students[(i + 4) % students.length];
        const members = [leader._id, students[(i + 5) % students.length]._id, students[(i + 6) % students.length]._id];
        const t = await findOrCreateTeam({
          name: additionalTeamNames[i],
          description: `${additionalTeamNames[i]} specializing in modern tech`,
          leader: leader._id,
          members,
          maxMembers: 4,
          department: leader.department,
          domain: additionalDomains[i]
        });
        teams.push(t);
      } catch (err) {
        console.warn(`⚠ Team "${additionalTeamNames[i]}" skipped:`, err.message);
        const existing = await Team.findOne({ name: additionalTeamNames[i] });
        if (existing) teams.push(existing);
      }
    }
    console.log(`✓ Additional teams ensured (8) - Total: ${teams.length} teams`);

    // Update students with team info (each student assigned to one team)
    // Ensure each student belongs to exactly 2 teams
console.log('Fixing student team assignments');

const allTeams = teams;
const teamCount = allTeams.length;

// Clear old team lists
await User.updateMany({ role: 'student' }, { $set: { teams: [] } });
await Team.updateMany({}, { $set: { members: [] } });

for (let i = 0; i < students.length; i++) {
  const s = students[i];

  // Pick 2 teams round robin
  const t1 = allTeams[i % teamCount]._id;
  const t2 = allTeams[(i + 1) % teamCount]._id;

  // Set exactly these 2 teams for the student
  await User.updateOne(
    { _id: s._id },
    { $set: { teams: [t1, t2] } }
  );

  // Add student to the selected teams
  await Team.updateOne(
    { _id: t1 },
    { $addToSet: { members: s._id } }
  );
  await Team.updateOne(
    { _id: t2 },
    { $addToSet: { members: s._id } }
  );
}

    // Assign each team to a faculty as mentor/guide (round-robin across ALL faculty)
    if (allFacultyUsers.length > 0) {
      for (let i = 0; i < teams.length; i++) {
        const faculty = allFacultyUsers[i % allFacultyUsers.length];
        await Team.updateOne(
          { _id: teams[i]._id },
          { $set: { assignedFaculty: faculty._id } }
        );
      }
      console.log('✓ Teams assigned to faculty (mentor mapping)');
    }

    // Create 12 problems across domains
    const problemTemplates = [
      ['Binary Search Tree Implementation','Implement a complete binary search tree with insert, delete, and search operations','Data Structures',100],
      ['Sorting Algorithms Comparison','Compare efficiency of different sorting algorithms - bubble, merge, quick sort','Algorithms',80],
      ['React Hooks Deep Dive','Understand useState, useEffect, useContext and custom hooks in React','Web Development',120],
      ['Graph Traversal (BFS & DFS)','Learn breadth-first search and depth-first search with real-world examples','Data Structures',90],
      ['Dynamic Programming Problems','Master dynamic programming with solutions to classic problems','Algorithms',150],
      ['JavaScript Async Patterns','Promises, async/await, and error handling in JavaScript','Web Development',75],
      ['Database Normalization','Understand 1NF, 2NF, 3NF, and BCNF with practical examples','Database Design',85],
      ['REST API Design Best Practices','Learn how to design scalable and secure REST APIs','Web Development',110],
      ['GraphQL vs REST','Compare GraphQL and REST APIs and where to use each','Web Development',95],
      ['Trie Data Structure','Implement trie and use it for prefix search','Data Structures',105],
      ['Greedy Algorithms','Problems solved using greedy techniques','Algorithms',70],
      ['Concurrency in Node.js','Handling concurrency and async patterns in Node.js','Web Development',130]
    ];

    const problems = [];
    for (let i = 0; i < problemTemplates.length; i++) {
      const [title, desc, domain, price] = problemTemplates[i];
      const creator = students[i % students.length];
      const prob = await findOrCreateProblem({
        title,
        description: desc,
        domain,
        price,
        createdBy: creator._id,
        upvotes: Math.floor(Math.random() * 10),
        upvotedBy: []
      });
      problems.push(prob);
    }
    console.log('✓ Problems ensured (12)');

    // Create Payments (12)
    const payments = [];
    for (let i = 0; i < 12; i++) {
      const user = students[i % students.length];
      const problem = problems[i % problems.length];
      const p = {
        user: user._id,
        problem: problem._id,
        amount: problem.price,
        currency: 'INR',
        razorpayOrderId: `order_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,
        razorpayPaymentId: `pay_${Date.now()}_${Math.random().toString(36).slice(2,10)}`,
        razorpaySignature: null,
        status: i % 3 === 0 ? 'failed' : 'success',
        paymentMethod: i % 2 === 0 ? 'card' : 'upi'
      };
      payments.push(p);
      // if success, add to user's purchasedProblems
      if (p.status === 'success') {
        await User.updateOne({ _id: user._id }, { $addToSet: { purchasedProblems: problem._id } });
      }
    }
    try {
      await Payment.insertMany(payments);
      console.log('✓ Payments created');
    } catch (err) {
      console.warn('⚠ Some payments may have been duplicates, continuing...');
    }

    // Create Chats (12 messages across teams)
    const chats = [];
    for (let i = 0; i < 12; i++) {
      const team = teams[i % teams.length];
      const sender = students[(i + 2) % students.length];
      chats.push({ team: team._id, sender: sender._id, message: `Hello from ${sender.name} (message ${i+1})` });
    }
    await Chat.insertMany(chats);
    console.log('✓ Chats created');

    // Create Feedbacks (10)
    const feedbacks = [];
    for (let i = 0; i < 10; i++) {
      const team = teams[i % teams.length];
      const faculty = facultyUsers[i % facultyUsers.length];
      feedbacks.push({ team: team._id, faculty: faculty._id, content: `Feedback ${i+1} for ${team.name}` });
    }
    await Feedback.insertMany(feedbacks);
    console.log('✓ Feedbacks created');

    // Create Upvotes (10) - track which user upvoted which problem
    const upvotes = [];
    for (let i = 0; i < 10; i++) {
      const problem = problems[i % problems.length];
      const user = facultyUsers[i % facultyUsers.length];
      // Upvote model expects 'user' (array in schema) - provide single id
      upvotes.push({ problem: problem._id, user: [user._id] });
      // Also update problem.upvotes and upvotedBy
      await Problem.findByIdAndUpdate(problem._id, { $inc: { upvotes: 1 }, $addToSet: { upvotedBy: user._id } });
    }
    try {
      await Upvote.insertMany(upvotes);
      console.log('✓ Upvotes created');
    } catch (err) {
      // If Upvote collection/index causes errors, log and continue
      console.warn('Upvote insert skipped due to error:', err.message);
    }

    // Create Downvotes (8) - track which user downvoted which problem
    const downvotes = [];
    for (let i = 0; i < 8; i++) {
      const problem = problems[(i + 3) % problems.length];
      const user = facultyUsers[(i + 1) % facultyUsers.length];
      // Downvote model expects 'user' (array in schema) - provide single id
      downvotes.push({ problem: problem._id, user: [user._id] });
      // Also update problem.downvotes and downvotedBy
      await Problem.findByIdAndUpdate(problem._id, { $inc: { downvotes: 1 }, $addToSet: { downvotedBy: user._id } });
    }
    try {
      await Downvote.insertMany(downvotes);
      console.log('✓ Downvotes created');
    } catch (err) {
      // If Downvote collection/index causes errors, log and continue
      console.warn('Downvote insert skipped due to error:', err.message);
    }

    console.log('\n✅ Database seeded successfully!\n');
    console.log('Demo Credentials:');
    console.log('Admin: admin@test.com / password123');
    console.log('Faculties: faculty1@test.com, faculty2@test.com, faculty3@test.com, faculty4@test.com (password123)');
    console.log('Students: student1@test.com .. student16@test.com (password123)');

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

connectDB().then(seedDatabase);
