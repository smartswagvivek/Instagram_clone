import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    media: {
      url: String,
      publicId: String,
      type: {
        type: String,
        enum: ['image', 'video'],
        default: 'image',
      },
    },
    caption: {
      type: String,
      maxlength: [250, 'Story caption must not exceed 250 characters'],
      default: '',
    },
    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'close_friends'],
      default: 'followers',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  {
    timestamps: true,
  }
);

storySchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('Story', storySchema);
