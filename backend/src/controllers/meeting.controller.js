import * as meetingService from '../services/meeting.service.js';

export async function list(req, res) {
  const status = req.query.status; // 'upcoming' | 'past' | 'cancelled' | undefined
  const meetings = await meetingService.listMeetings(req.userId, status);
  res.json({ success: true, data: meetings });
}

export async function getOne(req, res) {
  const meeting = await meetingService.getMeeting(req.userId, req.params.id);
  res.json({ success: true, data: meeting });
}

export async function cancel(req, res) {
  const meeting = await meetingService.cancelMeeting(req.userId, req.params.id);
  res.json({ success: true, data: meeting });
}

export async function reschedule(req, res) {
  const meeting = await meetingService.rescheduleMeeting(
    req.userId,
    req.params.id,
    req.body
  );
  res.status(201).json({ success: true, data: meeting });
}
