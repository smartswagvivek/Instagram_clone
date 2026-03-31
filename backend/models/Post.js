import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    type: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      default: '',
      maxlength: [2200, 'Caption must not exceed 2200 characters'],
    },
    media: {
      type: [mediaSchema],
      validate: {
        validator: (value) => value.length > 0,
        message: 'Post must include at least one media item',
      },
    },
    location: {
      type: String,
      default: '',
    },
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    saves: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public',
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    isReel: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    moderation: {
      status: {
        type: String,
        enum: ['clean', 'flagged'],
        default: 'clean',
      },
      flags: [String],
    },
    stats: {
      viewsCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
      savesCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ isReel: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });

postSchema.virtual('likesCount').get(function likesCount() {
  return this.likes?.length || 0;
});

export default mongoose.model('Post', postSchema);
