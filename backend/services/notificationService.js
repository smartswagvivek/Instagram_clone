import Notification from '../models/Notification.js';

export const createNotification = async (payload, io) => {
  const notification = await Notification.create(payload);
  const populated = await Notification.findById(notification._id)
    .populate('actor', 'username fullName profilePicture')
    .populate('post', 'media caption')
    .populate('comment', 'text')
    .populate('message', 'text');

  if (io && payload.recipient) {
    io.to(String(payload.recipient)).emit('notification:new', populated);
    io.to(String(payload.recipient)).emit(payload.type, populated);
  }

  return populated;
};
