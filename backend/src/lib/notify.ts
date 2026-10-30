// src/lib/notify.ts
import prisma from "./prisma";

interface NotifyOpts {
  userId: string;
  title:  string;
  body:   string;
  type:   string;
  link?:  string;
}

export async function createNotification(opts: NotifyOpts) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      title:  opts.title,
      body:   opts.body,
      type:   opts.type,
      link:   opts.link,
    },
  });
}

export async function notifyMany(userIds: string[], opts: Omit<NotifyOpts, "userId">) {
  return prisma.notification.createMany({
    data: userIds.map(userId => ({ userId, ...opts })),
  });
}
