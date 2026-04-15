import prisma from '../../prisma/prismaClient.js';
import ApiError from '../utils/ApiError.js';

const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  timezone: true,
  createdAt: true,
};

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: currentUserSelect,
  });

  if (!user) {
    throw ApiError.notFound('User not found.');
  }

  return user;
}

export async function updateCurrentUser(userId, data) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  if (!existing) {
    throw ApiError.notFound('User not found.');
  }

  if (data.username && data.username !== existing.username) {
    const usernameConflict = await prisma.user.findUnique({
      where: { username: data.username },
      select: { id: true },
    });

    if (usernameConflict && usernameConflict.id !== userId) {
      throw ApiError.conflict(`The username "${data.username}" is already in use.`);
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.username !== undefined && { username: data.username.trim().toLowerCase() }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
    },
    select: currentUserSelect,
  });
}
