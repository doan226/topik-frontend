export function getUserId(user) {
  if (!user) return null;
  return user.userId ?? user.id ?? null;
}

export function normalizeUser(user) {
  if (!user) return null;
  const id = getUserId(user);
  return { ...user, userId: id, id };
}
