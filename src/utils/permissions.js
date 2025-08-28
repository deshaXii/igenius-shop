export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions?.[permission];
};
