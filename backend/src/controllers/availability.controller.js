import * as availabilityService from '../services/availability.service.js';

// ── Schedules ──────────────────────────────────────────────────

export async function listSchedules(req, res) {
  const schedules = await availabilityService.listSchedules(req.userId);
  res.json({ success: true, data: schedules });
}

export async function getSchedule(req, res) {
  const schedule = await availabilityService.getSchedule(req.userId, req.params.id);
  res.json({ success: true, data: schedule });
}

export async function createSchedule(req, res) {
  const schedule = await availabilityService.createSchedule(req.userId, req.body);
  res.status(201).json({ success: true, data: schedule });
}

export async function updateSchedule(req, res) {
  const schedule = await availabilityService.updateSchedule(
    req.userId,
    req.params.id,
    req.body
  );
  res.json({ success: true, data: schedule });
}

export async function deleteSchedule(req, res) {
  await availabilityService.deleteSchedule(req.userId, req.params.id);
  res.json({ success: true, data: { message: 'Schedule deleted.' } });
}

// ── Rules ──────────────────────────────────────────────────────

export async function replaceRules(req, res) {
  const schedule = await availabilityService.replaceRules(
    req.userId,
    req.params.id,
    req.body.rules
  );
  res.json({ success: true, data: schedule });
}

// ── Overrides ──────────────────────────────────────────────────

export async function listOverrides(req, res) {
  const overrides = await availabilityService.listOverrides(req.userId, req.params.id);
  res.json({ success: true, data: overrides });
}

export async function createOverride(req, res) {
  const override = await availabilityService.createOverride(
    req.userId,
    req.params.id,
    req.body
  );
  res.status(201).json({ success: true, data: override });
}

export async function deleteOverride(req, res) {
  await availabilityService.deleteOverride(req.userId, req.params.id);
  res.json({ success: true, data: { message: 'Override deleted.' } });
}
