import prisma from './prismaClient.js';

async function main() {
  console.log('🌱 Starting database seeding...');

  // ── 1. Users ──────────────────────────────────────────────────
  const host = await prisma.user.upsert({
    where: { email: 'admin@calendlyclone.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@calendlyclone.com',
      passwordHash: 'hashed_password_placeholder', // replace with bcrypt in production
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
  console.log(`👤 Users ready: ${host.email}, ${guest.email}`);

  // ── 2. Event Types ────────────────────────────────────────────
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
  console.log('📅 Event types ready');

  // ── 3. Availability Schedule ──────────────────────────────────
  let schedule = await prisma.availabilitySchedule.findFirst({
    where: { userId: host.id, name: 'Working Hours' },
  });

  if (!schedule) {
    schedule = await prisma.availabilitySchedule.create({
      data: {
        userId: host.id,
        name: 'Working Hours',
        isDefault: true,
      },
    });

    // Weekly rules: Mon–Fri, 09:00–17:00
    const rules = [];
    for (let day = 1; day <= 5; day++) {
      rules.push({
        scheduleId: schedule.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
      });
    }
    await prisma.availabilityRule.createMany({ data: rules });
    console.log('⏰ Availability schedule + rules created (Mon-Fri 9-5)');
  } else {
    console.log('⏰ Availability schedule already exists — skipped');
  }

  // ── 4. Availability Override (fixed date) ─────────────────────
  // Use a fixed, known Tuesday so re-seeds don't create duplicates
  const blockedDate = new Date('2026-05-05T00:00:00.000Z'); // a Tuesday

  const existingOverride = await prisma.availabilityOverride.findFirst({
    where: { scheduleId: schedule.id, overrideDate: blockedDate },
  });

  if (!existingOverride) {
    await prisma.availabilityOverride.create({
      data: {
        scheduleId: schedule.id,
        overrideDate: blockedDate,
        isAvailable: false,
        note: 'Out of Office — personal day',
      },
    });
    console.log(`🏖️  Override created: blocked ${blockedDate.toDateString()}`);
  } else {
    console.log('🏖️  Override already exists — skipped');
  }

  // ── 5. Sample Booking (with question + answer) ────────────────
  // A guest booking on the quickChat event type
  const bookingStart = new Date('2026-05-06T14:00:00.000Z'); // Wed 10 AM ET
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

    // Attach a custom question and its answer
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
    console.log('📝 Sample booking already exists — skipped');
  }

  console.log('✅ Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
