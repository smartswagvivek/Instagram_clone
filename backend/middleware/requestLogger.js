export const requestLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const startedAt = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};
