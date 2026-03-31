import { DEFAULT_BANNED_WORDS } from '../constants/moderation.js';

const bannedWords = (
  process.env.MODERATION_BANNED_WORDS?.split(',').map((word) => word.trim().toLowerCase()) ||
  DEFAULT_BANNED_WORDS
).filter(Boolean);

export const moderateText = (text = '') => {
  const normalized = text.toLowerCase();
  const matches = bannedWords.filter((word) => normalized.includes(word));

  return {
    flagged: matches.length > 0,
    matches,
    status: matches.length > 0 ? 'flagged' : 'clean',
  };
};

export const assertCleanText = (text = '', label = 'content') => {
  const result = moderateText(text);

  if (result.flagged) {
    const error = new Error(`Your ${label} was blocked by moderation filters.`);
    error.statusCode = 400;
    error.details = result;
    throw error;
  }

  return result;
};
