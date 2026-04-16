import { useEffect, useState } from 'react';
import ModalFrame from '../ui/ModalFrame.jsx';
import EmptyState from '../ui/EmptyState.jsx';
import SlotPickerPanel from '../public/SlotPickerPanel.jsx';

const COMMON_TIMEZONES = [
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

export default function RescheduleModal({ open, meeting, submitting, onClose, onConfirm }) {
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedDate(null);
    setSelectedSlot(null);
    setTimezone(detectedTimezone);
  }, [detectedTimezone, open]);

  if (!open || !meeting) {
    return null;
  }

  const username = meeting.host?.username;
  const slug = meeting.eventType?.slug;
  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <ModalFrame title="Reschedule meeting" onClose={onClose} wide>
      {username && slug ? (
        <div className="stack">
          <label className="field field--compact">
            <span>Display timezone</span>
            <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezoneOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <SlotPickerPanel
            username={username}
            slug={slug}
            timezone={timezone}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSelectDate={setSelectedDate}
            onSelectSlot={setSelectedSlot}
          />

          <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={!selectedSlot || submitting}
              onClick={() => onConfirm(selectedSlot)}
            >
              Confirm new time
            </button>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Username setup is required"
          description="This meeting cannot be rescheduled with the new public routing scheme until the host has a username."
        />
      )}
    </ModalFrame>
  );
}
