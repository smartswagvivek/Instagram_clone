import Message from '../models/Message.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { assertCleanText } from '../services/moderationService.js';
import { createNotification } from '../services/notificationService.js';
import { uploadMediaFiles } from '../services/mediaService.js';

const messagePopulate = [
  { path: 'sender', select: 'username fullName profilePicture' },
  { path: 'recipient', select: 'username fullName profilePicture' },
  {
    path: 'replyTo',
    populate: { path: 'sender recipient', select: 'username fullName profilePicture' },
  },
  {
    path: 'sharedPost',
    populate: { path: 'author', select: 'username fullName profilePicture isVerified' },
  },
  { path: 'reactions.user', select: 'username fullName profilePicture' },
];

const getConversationQuery = (currentUserId, otherUserId) => ({
  $or: [
    { sender: currentUserId, recipient: otherUserId },
    { sender: otherUserId, recipient: currentUserId },
  ],
});

const buildConversationPreview = async (currentUser, participantId, query = '') => {
  const [participant, lastMessage, unreadCount] = await Promise.all([
    User.findById(participantId).select('username fullName profilePicture status'),
    Message.findOne({
      ...getConversationQuery(currentUser._id, participantId),
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate(messagePopulate),
    Message.countDocuments({
      sender: participantId,
      recipient: currentUser._id,
      isRead: false,
      isDeleted: false,
    }),
  ]);

  if (!participant) return null;

  if (query) {
    const normalized = query.toLowerCase();
    const matchesParticipant = [participant.username, participant.fullName]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalized));
    const matchesMessage = lastMessage?.text?.toLowerCase().includes(normalized);
    if (!matchesParticipant && !matchesMessage) {
      return null;
    }
  }

  return {
    user: participant,
    lastMessage,
    unreadCount,
    pinned: (currentUser.pinnedConversations || []).some((entry) => String(entry) === String(participantId)),
  };
};

export const sendMessage = asyncHandler(async (req, res) => {
  const recipient = await User.findById(req.body.recipientId);
  if (!recipient) {
    const error = new Error('Recipient not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.body.text && !req.files?.length && !req.body.sharedPostId) {
    const error = new Error('Message content is required');
    error.statusCode = 400;
    throw error;
  }

  if (req.body.text) {
    assertCleanText(req.body.text, 'message');
  }

  let sharedPost = null;
  if (req.body.sharedPostId) {
    sharedPost = await Post.findById(req.body.sharedPostId);
    if (!sharedPost) {
      const error = new Error('Shared post not found');
      error.statusCode = 404;
      throw error;
    }
  }

  let replyTo = null;
  if (req.body.replyToId) {
    replyTo = await Message.findById(req.body.replyToId);
  }

  const media = req.files?.length ? await uploadMediaFiles(req.files, 'messages') : [];
  const message = await Message.create({
    sender: req.user._id,
    recipient: recipient._id,
    text: req.body.text || '',
    media,
    sharedPost: sharedPost?._id,
    replyTo: replyTo?._id,
  });

  await message.populate(messagePopulate);

  req.app.get('io')?.to(String(recipient._id)).emit('message:new', message);

  await createNotification(
    {
      recipient: recipient._id,
      actor: req.user._id,
      type: 'message',
      message: message._id,
      title: `${req.user.username} sent you a message`,
      body: req.body.text || (sharedPost ? 'Shared a post with you' : 'Shared a media message'),
      link: `/messages?user=${req.user._id}`,
    },
    req.app.get('io')
  );

  res.status(201).json({ message: 'Message sent successfully', data: message });
});

export const getConversation = asyncHandler(async (req, res) => {
  const loadAllMessages = req.query.limit === 'all';
  const { page, limit, skip } = loadAllMessages
    ? { page: 1, limit: 0, skip: 0 }
    : getPagination(req.query.page, req.query.limit || 30);

  const messageQuery = Message.find({
    ...getConversationQuery(req.user._id, req.params.userId),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate(messagePopulate);

  if (!loadAllMessages) {
    messageQuery.skip(skip).limit(limit);
  }

  const messages = await messageQuery;

  await Message.updateMany(
    {
      sender: req.params.userId,
      recipient: req.user._id,
      isRead: false,
      isDeleted: false,
    },
    {
      isRead: true,
      seenAt: new Date(),
    }
  );

  res.json({ page, messages: messages.reverse(), hasMore: !loadAllMessages && messages.length === limit });
});

export const getConversations = asyncHandler(async (req, res) => {
  const sent = await Message.find({ sender: req.user._id, isDeleted: false }).distinct('recipient');
  const received = await Message.find({ recipient: req.user._id, isDeleted: false }).distinct('sender');
  const participantIds = [...new Set([...sent, ...received].map(String))];

  const conversations = (
    await Promise.all(
      participantIds.map((userId) => buildConversationPreview(req.user, userId, req.query.q || ''))
    )
  ).filter(Boolean);

  res.json(
    conversations.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0);
    })
  );
});

export const markMessageSeen = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(message.recipient) !== String(req.user._id)) {
    const error = new Error('Not authorized to mark this message as seen');
    error.statusCode = 403;
    throw error;
  }

  message.isRead = true;
  message.seenAt = new Date();
  await message.save();

  req.app.get('io')?.to(String(message.sender)).emit('message:seen', {
    messageId: message._id,
    seenAt: message.seenAt,
  });

  res.json(message);
});

export const editMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(message.sender) !== String(req.user._id)) {
    const error = new Error('Not authorized to edit this message');
    error.statusCode = 403;
    throw error;
  }

  if (!req.body.text?.trim()) {
    const error = new Error('Message text is required');
    error.statusCode = 400;
    throw error;
  }

  assertCleanText(req.body.text, 'message');
  message.text = req.body.text.trim();
  message.editedAt = new Date();
  await message.save();
  await message.populate(messagePopulate);

  req.app.get('io')?.to(String(message.recipient._id || message.recipient)).emit('message:updated', message);
  res.json(message);
});

export const toggleMessageReaction = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  const isParticipant =
    String(message.sender) === String(req.user._id) || String(message.recipient) === String(req.user._id);

  if (!isParticipant) {
    const error = new Error('Not authorized to react to this message');
    error.statusCode = 403;
    throw error;
  }

  const emoji = req.body.emoji?.trim();
  if (!emoji) {
    const error = new Error('Reaction emoji is required');
    error.statusCode = 400;
    throw error;
  }

  const existing = message.reactions.find((entry) => String(entry.user) === String(req.user._id));
  if (existing?.emoji === emoji) {
    message.reactions = message.reactions.filter((entry) => String(entry.user) !== String(req.user._id));
  } else if (existing) {
    existing.emoji = emoji;
  } else {
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();
  await message.populate(messagePopulate);

  const recipientId =
    String(message.sender._id || message.sender) === String(req.user._id)
      ? message.recipient._id || message.recipient
      : message.sender._id || message.sender;
  req.app.get('io')?.to(String(recipientId)).emit('message:updated', message);

  res.json(message);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    const error = new Error('Message not found');
    error.statusCode = 404;
    throw error;
  }

  if (String(message.sender) !== String(req.user._id)) {
    const error = new Error('Not authorized to delete this message');
    error.statusCode = 403;
    throw error;
  }

  message.isDeleted = true;
  message.isUnsent = true;
  message.text = '';
  message.media = [];
  message.reactions = [];
  await message.save();
  await message.populate(messagePopulate);

  req.app.get('io')?.to(String(message.recipient._id || message.recipient)).emit('message:updated', message);

  res.json({ message: 'Message deleted successfully' });
});
