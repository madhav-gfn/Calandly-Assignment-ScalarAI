import * as meService from '../services/me.service.js';

export async function getCurrent(req, res) {
  const user = await meService.getCurrentUser(req.userId);
  res.json({ success: true, data: user });
}

export async function updateCurrent(req, res) {
  const user = await meService.updateCurrentUser(req.userId, req.body);
  res.json({ success: true, data: user });
}
