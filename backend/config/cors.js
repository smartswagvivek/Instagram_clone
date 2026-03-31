const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
];

const normalizeOrigin = (origin = '') => origin.trim().replace(/\/+$/, '');

const splitOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

const isAllowedVercelPreview = (origin) => {
  if (process.env.ALLOW_VERCEL_PREVIEWS === 'false') {
    return false;
  }

  try {
    return new URL(normalizeOrigin(origin)).hostname.endsWith('.vercel.app');
  } catch (_error) {
    return false;
  }
};

export const allowedOrigins = Array.from(
  new Set([
    ...DEFAULT_ORIGINS,
    ...splitOrigins(process.env.FRONTEND_URL),
    ...splitOrigins(process.env.CORS_ORIGIN),
    ...splitOrigins(process.env.SOCKET_CORS_ORIGIN),
  ])
);

export const isOriginAllowed = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  return (
    !normalizedOrigin ||
    allowedOrigins.includes(normalizedOrigin) ||
    isAllowedVercelPreview(normalizedOrigin)
  );
};

export const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};
