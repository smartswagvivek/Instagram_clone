import Message from '../models/Message.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination } from '../utils/pagination.js';
import { assertCleanText } from '../services/moderationService.js';
import { createNotification } from '../services/notificationService.js';
import { uploadMediaFiles } from '../services/mediaService.js';

export const sendMessage = asyncHandler(async (req, res) => {
  const recipient = await User.findById(req.body.recipientId);
  if (!recipient) {
    const error = new Error('Recipient not found');
    error.statusCode = 404;
    throw error;
  }

  if (!req.body.text && !req.files?.length) {
    const error = new Error('Message content is required');
    error.statusCode = 400;
    throw error;
  }

  if (req.body.text) {
    assertCleanText(req.body.text, 'message');
  }

  const media = req.files?.length ? await uploadMediaFiles(req.files, 'messages') : [];
  const message = await Message.create({
    sender: req.user._id,
    recipient: recipient._id,
    text: req.body.text || '',
    media,
  });

  await message.populate('sender recipient', 'username fullName profilePicture');

  req.app.get('io')?.to(String(recipient._id)).emit('message:new', message);

  await createNotification(
    {
      recipient: recipient._id,
      actor: req.user._id,
      type: 'message',
      message: message._id,
      title: `${req.user.username} sent you a message`,
      body: req.body.text || 'Shared a media message',
      link: `/messages?user=${req.user._id}`,
    },
    req.app.get('io')
  );

  res.status(201).json({ message: 'Message sent successfully', data: message });
});

export const getConversation = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query.page, req.query.limit || 30);

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, recipient: req.params.userId },
      { sender: req.params.userId, recipient: req.user._id },
    ],
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender recipient', 'username fullName profilePicture');

  await Message.updateMany(
    {
      sender: req.params.userId,
      recipient: req.user._id,
      isRead: false,
    },
    {
      isRead: true,
      seenAt: new Date(),
    }
  );

  res.json({ page, messages: messages.reverse() });
});

export const getConversations = asyncHandler(async (req, res) => {
  const sent = await Message.find({ sender: req.user._id }).distinct('recipient');
  const received = await Message.find({ recipient: req.user._id }).distinct('sender');
  const participantIds = [...new Set([...sent, ...received].map(String))];

  const conversations = await Promise.all(
    participantIds.map(async (userId) => {
      const [participant, lastMessage, unreadCount] = await Promise.all([
        User.findById(userId).select('username fullName profilePicture status'),
        Message.findOne({
          $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id },
          ],
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .populate('sender recipient', 'username fullName profilePicture'),
        Message.countDocuments({
          sender: userId,
          recipient: req.user._id,
          isRead: false,
        }),
      ]);

      return {
        user: participant,
        lastMessage,
        unreadCount,
      };
    })
  );

  res.json(
    conversations.sort(
      (a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
    )
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
  await message.save();

  res.json({ message: 'Message deleted successfully' });
});
