import dotenv from 'dotenv';

import { connectDB } from '../config/db.js';
import Comment from '../models/Comment.js';
import Message from '../models/Message.js';
import Post from '../models/Post.js';
import Story from '../models/Story.js';
import User from '../models/User.js';

dotenv.config();

const mediaLibrary = [
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
];

const usersSeed = [
  {
    username: 'vivek_pixels',
    email: 'vivek@example.com',
    password: 'Password123!',
    fullName: 'Vivek Sharma',
    bio: 'Street frames, chai runs, and product experiments.',
    isVerified: true,
  },
  {
    username: 'mira.codes',
    email: 'mira@example.com',
    password: 'Password123!',
    fullName: 'Mira Patel',
    bio: 'Frontend engineer with an eye for motion and details.',
    isVerified: true,
  },
  {
    username: 'noah.frames',
    email: 'noah@example.com',
    password: 'Password123!',
    fullName: 'Noah Fernandes',
    bio: 'Capturing monsoon reflections and late-night city walks.',
  },
  {
    username: 'tara.eats',
    email: 'tara@example.com',
    password: 'Password123!',
    fullName: 'Tara Iyer',
    bio: 'Food diary, travel notes, and everyday cafe moments.',
  },
  {
    username: 'arjun.builds',
    email: 'arjun@example.com',
    password: 'Password123!',
    fullName: 'Arjun Nair',
    bio: 'Backend systems, clean APIs, and weekend football.',
  },
  {
    username: 'sana.designs',
    email: 'sana@example.com',
    password: 'Password123!',
    fullName: 'Sana Khan',
    bio: 'Design systems and polished product details.',
  },
  {
    username: 'dev.codes',
    email: 'dev@example.com',
    password: 'Password123!',
    fullName: 'Dev Mehta',
    bio: 'Full-stack shipping mode, all week long.',
  },
  {
    username: 'priya.travels',
    email: 'priya@example.com',
    password: 'Password123!',
    fullName: 'Priya Verma',
    bio: 'Flights booked, camera charged, notes ready.',
  },
  {
    username: 'karan.fit',
    email: 'karan@example.com',
    password: 'Password123!',
    fullName: 'Karan Arora',
    bio: 'Morning runs, gym logs, and clean eating.',
  },
  {
    username: 'isha.reads',
    email: 'isha@example.com',
    password: 'Password123!',
    fullName: 'Isha Menon',
    bio: 'Books, coffee, and thoughtful internet corners.',
  },
];

const captionSets = {
  vivek_pixels: [
    'Late afternoon frames from Bangalore. #street #citylight',
    'Built a cleaner feed layout tonight. #product #design',
    'Weekend walk, camera battery full, mind clear. #weekend',
  ],
  mira_codes: [
    'Shipping the search panel with better empty states. #react #ui',
    'Small spacing changes can change everything. #frontend #buildinpublic',
    'Tonight is for polish, states, and fewer regressions. #devlife',
  ],
  noah_frames: [
    'Rainy glass, neon lights, and a quiet street. #photography',
    'A frame from the city that felt like a movie set. #nightwalk',
    'Cloud cover made this light perfect. #camera',
  ],
  tara_eats: [
    'Coffee first, decisions later. #cafe',
    'Testing another breakfast spot this morning. #foodie',
    'A quick plate, a slower afternoon. #brunch',
  ],
  arjun_builds: [
    'API traces are finally looking clean. #backend',
    'Shipped the follow flow without breaking auth. #nodejs',
    'Refactors feel better with solid tests behind them. #engineering',
  ],
  sana_designs: [
    'A softer card system for cleaner surfaces. #designsystem',
    'Type scale pass for the profile screen. #ux',
    'Working on motion that stays subtle. #productdesign',
  ],
  dev_codes: [
    'Full-stack days are just frontend bugs wearing backend jackets. #devhumor',
    'Socket events are finally lining up with UI state. #socketio',
    'A good debug session fixes your mood too. #build',
  ],
  priya_travels: [
    'Airport notes and sunrise windows. #travel',
    'Collected too many photos and still want more. #wander',
    'A slower morning in a new city. #journey',
  ],
  karan_fit: [
    'Run logged before the city fully woke up. #fitness',
    'Meal prep and miles today. #discipline',
    'Recovery day but still outdoors. #routine',
  ],
  isha_reads: [
    'Current read, current coffee, current peace. #books',
    'The kind of corner you want to stay in longer. #reading',
    'Notes in the margin and nowhere else to be. #quietinternet',
  ],
};

const normalizeKey = (username) => username.replaceAll('.', '_');

const makePostDoc = (user, caption, mediaIndex, extra = {}) => ({
  author: user._id,
  caption,
  media: [
    {
      url: mediaLibrary[mediaIndex % mediaLibrary.length],
      publicId: `seed-${user.username}-${mediaIndex}`,
      type: extra.type || 'image',
    },
  ],
  hashtags: [...new Set((caption.match(/#([\w-]+)/g) || []).map((tag) => tag.replace('#', '').toLowerCase()))],
  visibility: 'public',
  isReel: Boolean(extra.isReel),
  likes: extra.likes || [],
  stats: {
    commentsCount: extra.commentsCount || 0,
    sharesCount: extra.sharesCount || 0,
    savesCount: extra.savesCount || 0,
    viewsCount: extra.viewsCount || 0,
  },
});

export const seedDatabase = async ({ reset = true } = {}) => {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Story.deleteMany({}),
      Comment.deleteMany({}),
      Message.deleteMany({}),
    ]);
  }

  await Promise.all([
    User.syncIndexes(),
    Post.syncIndexes(),
    Story.syncIndexes(),
    Comment.syncIndexes(),
    Message.syncIndexes(),
  ]);

  const users = await User.create(usersSeed);
  const usersByUsername = Object.fromEntries(users.map((user) => [user.username, user]));
  const vivek = usersByUsername.vivek_pixels;
  const everyoneElse = users.filter((user) => String(user._id) !== String(vivek._id));

  // Mutuals
  everyoneElse.slice(0, 5).forEach((friend) => {
    vivek.following.push(friend._id);
    vivek.followers.push(friend._id);
    vivek.closeFriends.push(friend._id);
    friend.following.push(vivek._id);
    friend.followers.push(vivek._id);
  });

  // Follow-back opportunities
  everyoneElse.slice(5, 7).forEach((friend) => {
    vivek.followers.push(friend._id);
    friend.following.push(vivek._id);
  });

  // Accounts Vivek follows
  everyoneElse.slice(7, 9).forEach((friend) => {
    vivek.following.push(friend._id);
    friend.followers.push(vivek._id);
  });

  // A few extra links so feed/search feel less empty.
  usersByUsername['mira.codes'].following.push(
    usersByUsername['noah.frames']._id,
    usersByUsername['sana.designs']._id
  );
  usersByUsername['noah.frames'].followers.push(usersByUsername['mira.codes']._id);
  usersByUsername['sana.designs'].followers.push(usersByUsername['mira.codes']._id);

  usersByUsername['tara.eats'].following.push(usersByUsername['priya.travels']._id);
  usersByUsername['priya.travels'].followers.push(usersByUsername['tara.eats']._id);

  usersByUsername['arjun.builds'].following.push(usersByUsername['dev.codes']._id);
  usersByUsername['dev.codes'].followers.push(usersByUsername['arjun.builds']._id);

  await Promise.all(users.map((user) => user.save()));

  const postDocs = [];
  let mediaIndex = 0;

  users.forEach((user, userIndex) => {
    const captions = captionSets[normalizeKey(user.username)];
    const postCount = userIndex % 2 === 0 ? 3 : 2;

    captions.slice(0, postCount).forEach((caption, captionIndex) => {
      const likers = everyoneElse
        .filter((candidate, candidateIndex) => candidateIndex % (captionIndex + 2) === 0)
        .slice(0, 4)
        .map((candidate) => candidate._id);

      postDocs.push(
        makePostDoc(user, caption, mediaIndex++, {
          isReel: captionIndex === 0 && userIndex % 3 === 0,
          likes: likers,
          commentsCount: Math.min(captionIndex + 1, 3),
          sharesCount: captionIndex,
          savesCount: captionIndex + 1,
          viewsCount: 20 + userIndex * 7 + captionIndex * 9,
        })
      );
    });
  });

  const posts = await Post.create(postDocs);
  const postsByAuthor = posts.reduce((acc, post) => {
    const authorKey = String(post.author);
    acc[authorKey] = acc[authorKey] || [];
    acc[authorKey].push(post);
    return acc;
  }, {});

  const comments = [];
  users.forEach((user, index) => {
    const targetPosts = postsByAuthor[String(user._id)] || [];
    if (!targetPosts[0]) return;

    const commenterA = everyoneElse[index % everyoneElse.length];
    const commenterB = everyoneElse[(index + 2) % everyoneElse.length];

    comments.push({
      post: targetPosts[0]._id,
      author: commenterA._id,
      text: `Love this update, ${user.username}.`,
    });

    if (targetPosts[1]) {
      comments.push({
        post: targetPosts[1]._id,
        author: commenterB._id,
        text: 'This looks really polished.',
      });
    }
  });

  await Comment.create(comments);

  await Promise.all(
    posts.map((post) =>
      Comment.countDocuments({ post: post._id }).then((count) =>
        Post.findByIdAndUpdate(post._id, {
          $set: { 'stats.commentsCount': count },
        })
      )
    )
  );

  await Story.create(
    users.slice(0, 6).map((user, index) => ({
      author: user._id,
      media: {
        url: mediaLibrary[(index + 3) % mediaLibrary.length],
        publicId: `story-${user.username}`,
        type: 'image',
      },
      caption: `Story update from ${user.fullName}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }))
  );

  await Message.create([
    {
      sender: vivek._id,
      recipient: usersByUsername['mira.codes']._id,
      text: 'Search results now show all matching accounts.',
      isRead: true,
      seenAt: new Date(),
    },
    {
      sender: usersByUsername['mira.codes']._id,
      recipient: vivek._id,
      text: 'Nice, I am checking the follow-back state next.',
    },
    {
      sender: usersByUsername['noah.frames']._id,
      recipient: vivek._id,
      text: 'Your latest street frame is strong.',
    },
  ]);

  return {
    users: users.length,
    posts: posts.length,
  };
};

const main = async () => {
  await connectDB();
  const result = await seedDatabase({ reset: true });

  console.log(
    `Seed data created successfully with ${result.users} users and ${result.posts} posts.`
  );
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
