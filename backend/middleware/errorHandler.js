export const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    details: err.details || undefined,
  });
};
