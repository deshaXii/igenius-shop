export const isDbSizeWarning = (usedMB, maxMB = 512) => {
  return usedMB / maxMB >= 0.9;
};
