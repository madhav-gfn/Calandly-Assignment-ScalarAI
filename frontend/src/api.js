import axios from 'axios';
import { eachDayOfInterval, endOfMonth, format, startOfMonth, startOfToday } from 'date-fns';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

function unwrap(response) {
  return response.data.data;
}

export function getApiErrorMessage(error, fallback = 'Something went wrong.') {
  return error?.response?.data?.error?.message || error?.message || fallback;
}

export function slugifyValue(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function buildPublicBookingPath(username, slug) {
  return `/${username}/${slug}`;
}

export function buildPublicBookingUrl(username, slug) {
  return `${window.location.origin}${buildPublicBookingPath(username, slug)}`;
}

export async function getCurrentUser() {
  return api.get('/me').then(unwrap);
}

export async function updateCurrentUser(payload) {
  return api.put('/me', payload).then(unwrap);
}

export async function listEventTypes() {
  return api.get('/event-types').then(unwrap);
}

export async function createEventType(payload) {
  return api.post('/event-types', payload).then(unwrap);
}

export async function updateEventType(id, payload) {
  return api.put(`/event-types/${id}`, payload).then(unwrap);
}

export async function deleteEventType(id) {
  return api.delete(`/event-types/${id}`).then(unwrap);
}

export async function listSchedules() {
  return api.get('/availability/schedules').then(unwrap);
}

export async function createSchedule(payload) {
  return api.post('/availability/schedules', payload).then(unwrap);
}

export async function updateSchedule(id, payload) {
  return api.put(`/availability/schedules/${id}`, payload).then(unwrap);
}

export async function deleteSchedule(id) {
  return api.delete(`/availability/schedules/${id}`).then(unwrap);
}

export async function replaceScheduleRules(id, rules) {
  return api.put(`/availability/schedules/${id}/rules`, { rules }).then(unwrap);
}

export async function createOverride(scheduleId, payload) {
  return api.post(`/availability/schedules/${scheduleId}/overrides`, payload).then(unwrap);
}

export async function deleteOverride(overrideId) {
  return api.delete(`/availability/overrides/${overrideId}`).then(unwrap);
}

export async function listMeetings(status) {
  return api
    .get('/meetings', {
      params: status ? { status } : undefined,
    })
    .then(unwrap);
}

export async function getMeeting(id) {
  return api.get(`/meetings/${id}`).then(unwrap);
}

export async function cancelMeeting(id, reason) {
  return api.patch(`/meetings/${id}/cancel`, { reason }).then(unwrap);
}

export async function rescheduleMeeting(id, payload) {
  return api.post(`/meetings/${id}/reschedule`, payload).then(unwrap);
}

export async function getPublicEventInfo(username, slug) {
  return api.get(`/booking/${username}/${slug}`).then(unwrap);
}

export async function getPublicSlots(username, slug, date, timezone) {
  return api
    .get(`/booking/${username}/${slug}/slots`, {
      params: { date, timezone },
    })
    .then(unwrap);
}

export async function createPublicBooking(username, slug, payload) {
  return api.post(`/booking/${username}/${slug}/book`, payload).then(unwrap);
}

export async function getMonthAvailability(username, slug, month, timezone) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const today = startOfToday();

  const dates = eachDayOfInterval({ start: monthStart, end: monthEnd }).filter(
    (date) => date >= today
  );

  const results = await Promise.all(
    dates.map(async (date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const data = await getPublicSlots(username, slug, dateKey, timezone);
      return [dateKey, data.slots];
    })
  );

  return Object.fromEntries(results);
}
