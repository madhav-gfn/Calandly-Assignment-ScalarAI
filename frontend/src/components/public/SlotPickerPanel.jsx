import { startTransition, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DayPicker } from 'react-day-picker';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import { getMonthAvailability, getPublicSlots } from '../../api.js';

function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

export default function SlotPickerPanel({
  username,
  slug,
  timezone,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}) {
  const [month, setMonth] = useState(selectedDate || startOfToday());

  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
    }
  }, [selectedDate]);

  const monthKey = format(month, 'yyyy-MM');

  const availabilityQuery = useQuery({
    queryKey: ['month-availability', username, slug, timezone, monthKey],
    queryFn: () => getMonthAvailability(username, slug, month, timezone),
  });

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : '';

  const slotsQuery = useQuery({
    queryKey: ['public-slots', username, slug, timezone, selectedDateKey],
    queryFn: () => getPublicSlots(username, slug, selectedDateKey, timezone),
    enabled: Boolean(selectedDateKey),
  });

  const availableDateKeys = availabilityQuery.data
    ? Object.entries(availabilityQuery.data)
        .filter(([, slots]) => slots.length > 0)
        .map(([dateKey]) => dateKey)
    : [];

  const availableDates = useMemo(
    () => availableDateKeys.map((dateKey) => parseISO(`${dateKey}T00:00:00`)),
    [availableDateKeys]
  );

  const dayDisabled = (date) => {
    if (isBefore(date, startOfToday())) {
      return true;
    }

    if (!availabilityQuery.data || date.getMonth() !== month.getMonth()) {
      return false;
    }

    const key = formatDateKey(date);
    return !availabilityQuery.data[key] || availabilityQuery.data[key].length === 0;
  };

  const slots = slotsQuery.data?.slots || [];

  return (
    <div className="slot-picker">
      <div className="slot-picker__calendar">
        <DayPicker
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            startTransition(() => {
              onSelectDate(date);
              onSelectSlot(null);
            });
          }}
          showOutsideDays
          disabled={dayDisabled}
          modifiers={{ available: availableDates }}
          className="calendar-surface"
        />
      </div>

      <div className="slot-picker__slots">
        {selectedDate ? (
          <>
            <div className="slot-picker__heading">
              <h3>{format(selectedDate, 'EEEE, MMM d')}</h3>
              <p>{timezone}</p>
            </div>

            {slotsQuery.isLoading ? (
              <div className="loader loader--compact">
                <div className="loader__spinner" />
                <span>Loading times...</span>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-muted">No times available for this date.</p>
            ) : (
              <div className="slots-list">
                {slots.map((slot) => (
                  <button
                    key={slot.startUtc}
                    type="button"
                    className={`slot-button ${selectedSlot?.startUtc === slot.startUtc ? 'is-selected' : ''}`}
                    onClick={() => onSelectSlot(slot)}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : availabilityQuery.isLoading ? (
          <div className="loader loader--compact">
            <div className="loader__spinner" />
            <span>Loading month availability...</span>
          </div>
        ) : (
          <p className="text-muted">Select a highlighted date to view available time blocks.</p>
        )}
      </div>
    </div>
  );
}
