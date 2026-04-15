import prisma from './prismaClient.js';

async function ensureSchedule(userId, rulesData) {
  let schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId, name: 'Working Hours' },
  });

  if (!schedule) {
    schedule = await prisma.availabilitySchedule.create({
      data: {
        userId,
        name: 'Working Hours',
        isDefault: true,
      },
    });
  } else if (!schedule.isDefault) {
    schedule = await prisma.availabilitySchedule.update({
      where: { id: schedule.id },
      data: { isDefault: true },
    });
  }

  const existingRules = await prisma.availabilityRule.findMany({
    where: { scheduleId: schedule.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const shouldReplaceRules =
    existingRules.length !== rulesData.length ||
    existingRules.some((rule, index) => {
      const nextRule = rulesData[index];
      return (
        !nextRule ||
        rule.dayOfWeek !== nextRule.dayOfWeek ||
        rule.startTime !== nextRule.startTime ||
        rule.endTime !== nextRule.endTime
      );
    });

  if (shouldReplaceRules) {
    await prisma.$transaction([
      prisma.availabilityRule.deleteMany({ where: { scheduleId: schedule.id } }),
      prisma.availabilityRule.createMany({
        data: rulesData.map((rule) => ({
          scheduleId: schedule.id,
          dayOfWeek: rule.dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })),
      }),
    ]);
  }

  return schedule;
}

async function main() {
  console.log('🌱 Starting database seeding...');

  const host = await prisma.user.upsert({
    where: { email: 'admin@calendlyclone.com' },
    update: {
      name: 'Madhav Mishra',
      username: 'madhav-mishra',
      timezone: 'America/New_York',
    },
    create: {
      name: 'Madhav Mishra',
      email: 'admin@calendlyclone.com',
      username: 'madhav-mishra',
      passwordHash: 'hashed_password_placeholder',
      timezone: 'America/New_York',
    },
  });

  const guest = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      passwordHash: 'hashed_password_placeholder',
      timezone: 'Asia/Kolkata',
    },
  });

  const secondHost = await prisma.user.upsert({
    where: { email: 'alex@calendlyclone.com' },
    update: {
      name: 'Alex Rivera',
      username: 'alex-rivera',
      timezone: 'Europe/London',
    },
    create: {
      name: 'Alex Rivera',
      email: 'alex@calendlyclone.com',
      username: 'alex-rivera',
      passwordHash: 'hashed_password_placeholder',
      timezone: 'Europe/London',
    },
  });

  console.log(`👤 Users ready: ${host.email}, ${guest.email}, ${secondHost.email}`);

  const quickChat = await prisma.eventType.upsert({
    where: {
      userId_slug: { userId: host.id, slug: '15-min-chat' },
    },
    update: {},
    create: {
      userId: host.id,
      title: '15 Min Chat',
      slug: '15-min-chat',
      durationMinutes: 15,
      description: 'A quick 15-minute catch-up or introduction.',
      meetingMode: 'google_meet',
      bufferBeforeMin: 0,
      bufferAfterMin: 5,
    },
  });

  await prisma.eventType.upsert({
    where: {
      userId_slug: { userId: host.id, slug: '60-min-deep-dive' },
    },
    update: {},
    create: {
      userId: host.id,
      title: '60 Min Deep Dive',
      slug: '60-min-deep-dive',
      durationMinutes: 60,
      description: 'A comprehensive 60-minute discussion or pairing session.',
      meetingMode: 'zoom',
      bufferBeforeMin: 15,
      bufferAfterMin: 15,
    },
  });

  await prisma.eventType.upsert({
    where: {
      userId_slug: { userId: secondHost.id, slug: '15-min-chat' },
    },
    update: {},
    create: {
      userId: secondHost.id,
      title: '15 Min Chat',
      slug: '15-min-chat',
      durationMinutes: 15,
      description: 'A second host with the same public slug for username-based routing.',
      meetingMode: 'google_meet',
      bufferBeforeMin: 0,
      bufferAfterMin: 0,
    },
  });

  console.log('📅 Event types ready');

  const hostRules = [];
  for (let day = 1; day <= 5; day += 1) {
    hostRules.push(
      { dayOfWeek: day, startTime: '09:00', endTime: '12:00' },
      { dayOfWeek: day, startTime: '13:00', endTime: '17:00' }
    );
  }

  const secondHostRules = [];
  for (let day = 1; day <= 5; day += 1) {
    secondHostRules.push({ dayOfWeek: day, startTime: '10:00', endTime: '16:00' });
  }

  const hostSchedule = await ensureSchedule(host.id, hostRules);
  await ensureSchedule(secondHost.id, secondHostRules);
  console.log('⏰ Availability schedules ready');

  const blockedDate = new Date('2026-05-05T00:00:00.000Z');
  const existingOverride = await prisma.availabilityOverride.findFirst({
    where: { scheduleId: hostSchedule.id, overrideDate: blockedDate },
  });

  if (!existingOverride) {
    await prisma.availabilityOverride.create({
      data: {
        scheduleId: hostSchedule.id,
        overrideDate: blockedDate,
        isAvailable: false,
        note: 'Out of Office - personal day',
      },
    });
    console.log(`🏖️ Override created: blocked ${blockedDate.toDateString()}`);
  } else {
    console.log('🏖️ Override already exists - skipped');
  }

  const bookingStart = new Date('2026-05-06T14:00:00.000Z');
  const bookingEnd = new Date('2026-05-06T14:15:00.000Z');

  let booking = await prisma.booking.findFirst({
    where: {
      hostId: host.id,
      eventTypeId: quickChat.id,
      startAt: bookingStart,
    },
  });

  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        eventTypeId: quickChat.id,
        hostId: host.id,
        inviteeId: guest.id,
        inviteeName: guest.name,
        inviteeEmail: guest.email,
        startAt: bookingStart,
        endAt: bookingEnd,
        status: 'SCHEDULED',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
      },
    });

    const question = await prisma.bookingQuestion.create({
      data: {
        bookingId: booking.id,
        questionText: 'What would you like to discuss?',
        sortOrder: 1,
        isRequired: true,
      },
    });

    await prisma.bookingAnswer.create({
      data: {
        questionId: question.id,
        answerText: 'I want to discuss the Q3 product roadmap.',
      },
    });

    console.log('📝 Sample booking with Q&A created');
  } else {
    console.log('📝 Sample booking already exists - skipped');
  }

  console.log('✅ Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seeding failed:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
