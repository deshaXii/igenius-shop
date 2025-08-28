export const createNotification = (message, type = "info") => {
  return {
    id: Date.now(),
    message,
    type,
  };
};
