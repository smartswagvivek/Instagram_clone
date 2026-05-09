import mongoose from 'mongoose';

const messageReactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: [10, 'Reaction emoji is too long'],
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: '',
    },
    media: [
      {
        url: String,
        publicId: String,
        type: {
          type: String,
          enum: ['image', 'video', 'audio'],
        },
      },
    ],
    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: {
      type: [messageReactionSchema],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    seenAt: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isUnsent: {
      type: Boolean,
      default: false,
    },
    editedAt: Date,
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, isRead: 1 });

export default mongoose.model('Message', messageSchema);
