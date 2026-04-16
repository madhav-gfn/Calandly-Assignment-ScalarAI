// ── Shared application-level constants ────────────────────────────────────────

export const DAY_ROWS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

export const CORE_ROUTES = [
  { label: 'Scheduling', to: '/app/scheduling', icon: 'link' },
  { label: 'Meetings', to: '/app/meetings', icon: 'calendar' },
  { label: 'Availability', to: '/app/availability', icon: 'clock' },
];

export const EXTRA_ROUTES = [
  { label: 'Contacts', to: '/app/contacts', icon: 'users' },
  { label: 'Workflows', to: '/app/workflows', icon: 'spark' },
  { label: 'Integrations & apps', to: '/app/integrations', icon: 'grid' },
  { label: 'Routing', to: '/app/routing', icon: 'swap' },
  { label: 'Analytics', to: '/app/analytics', icon: 'chart' },
  { label: 'Admin center', to: '/app/admin', icon: 'shield' },
];

export const EVENT_ACCENTS = ['#8247F5', '#0AE8F0', '#006BFF', '#FF6B35', '#13C296', '#E756B5'];

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export const MEETING_MODE_LABELS = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  in_person: 'In person',
  phone: 'Phone call',
};

export const CONFIRMATION_STORAGE_KEY = 'calendly-clone-confirmation';
