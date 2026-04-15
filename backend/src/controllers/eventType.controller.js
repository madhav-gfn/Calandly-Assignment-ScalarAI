import * as eventTypeService from '../services/eventType.service.js';

export async function list(req, res) {
  const eventTypes = await eventTypeService.listEventTypes(req.userId);
  res.json({ success: true, data: eventTypes });
}

export async function getOne(req, res) {
  const eventType = await eventTypeService.getEventType(req.userId, req.params.id);
  res.json({ success: true, data: eventType });
}

export async function create(req, res) {
  const eventType = await eventTypeService.createEventType(req.userId, req.body);
  res.status(201).json({ success: true, data: eventType });
}

export async function update(req, res) {
  const eventType = await eventTypeService.updateEventType(req.userId, req.params.id, req.body);
  res.json({ success: true, data: eventType });
}

export async function remove(req, res) {
  await eventTypeService.deleteEventType(req.userId, req.params.id);
  res.json({ success: true, data: { message: 'Event type deactivated.' } });
}
