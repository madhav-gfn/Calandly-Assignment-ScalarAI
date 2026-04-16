import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, startOfToday } from 'date-fns';
import { Plus } from 'lucide-react';
import {
  createOverride,
  createSchedule,
  deleteOverride,
  deleteSchedule,
  listSchedules,
  replaceScheduleRules,
  updateCurrentUser,
  updateSchedule,
} from '../api.js';
import { COMMON_TIMEZONES, DAY_ROWS } from '../constants.js';
import { createRulesByDay, flattenRulesByDay, formatDateKey } from '../utils/helpers.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';

export default function AvailabilityPage() {
  const { me } = useOutletContext();
  const queryClient = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [draftRulesByDay, setDraftRulesByDay] = useState(createRulesByDay());
  const [statusMessage, setStatusMessage] = useState('');
  const [newScheduleName, setNewScheduleName] = useState('');
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [overrideDraft, setOverrideDraft] = useState({
    isAvailable: false,
    startTime: '09:00',
    endTime: '17:00',
    note: '',
  });

  const schedulesQuery = useQuery({
    queryKey: ['schedules'],
    queryFn: listSchedules,
  });

  const updateMeMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setStatusMessage('Timezone updated.');
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: createSchedule,
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setSelectedScheduleId(schedule.id);
      setNewScheduleName('');
      setStatusMessage('Schedule created.');
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => updateSchedule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setStatusMessage('Schedule updated.');
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setSelectedScheduleId('');
      setStatusMessage('Schedule deleted.');
    },
  });

  const saveRulesMutation = useMutation({
    mutationFn: ({ id, rules }) => replaceScheduleRules(id, rules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setStatusMessage('Weekly hours saved.');
    },
  });

  const saveOverrideMutation = useMutation({
    mutationFn: async ({ scheduleId, overrideId, payload }) => {
      if (overrideId) {
        await deleteOverride(overrideId);
      }
      return createOverride(scheduleId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setStatusMessage('Date-specific hours saved.');
    },
  });

  const deleteOverrideMutation = useMutation({
    mutationFn: deleteOverride,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setStatusMessage('Override removed.');
    },
  });

  const schedules = schedulesQuery.data || [];
  const selectedSchedule =
    schedules.find((schedule) => schedule.id === selectedScheduleId) ||
    schedules.find((schedule) => schedule.isDefault) ||
    schedules[0];

  useEffect(() => {
    if (!selectedScheduleId && selectedSchedule?.id) {
      setSelectedScheduleId(selectedSchedule.id);
    }
  }, [selectedSchedule, selectedScheduleId]);

  useEffect(() => {
    if (selectedSchedule) {
      setDraftRulesByDay(createRulesByDay(selectedSchedule.rules));
    }
  }, [selectedSchedule]);

  const selectedDateKey = formatDateKey(selectedDate);
  const existingOverride = selectedSchedule?.overrides?.find(
    (override) => formatDateKey(parseISO(override.overrideDate)) === selectedDateKey
  );

  useEffect(() => {
    if (existingOverride) {
      setOverrideDraft({
        isAvailable: existingOverride.isAvailable,
        startTime: existingOverride.startTime || '09:00',
        endTime: existingOverride.endTime || '17:00',
        note: existingOverride.note || '',
      });
      return;
    }

    setOverrideDraft({
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
      note: '',
    });
  }, [existingOverride, selectedDateKey]);

  const timezoneOptions = useMemo(() => {
    if (COMMON_TIMEZONES.includes(me.timezone)) {
      return COMMON_TIMEZONES;
    }

    return [me.timezone, ...COMMON_TIMEZONES];
  }, [me.timezone]);

  const updateBlock = (dayValue, index, field, value) => {
    setDraftRulesByDay((current) => ({
      ...current,
      [dayValue]: current[dayValue].map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const addBlock = (dayValue) => {
    setDraftRulesByDay((current) => ({
      ...current,
      [dayValue]: [...(current[dayValue] || []), { startTime: '09:00', endTime: '17:00' }],
    }));
  };

  const removeBlock = (dayValue, index) => {
    setDraftRulesByDay((current) => ({
      ...current,
      [dayValue]: current[dayValue].filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const toggleDay = (dayValue) => {
    setDraftRulesByDay((current) => ({
      ...current,
      [dayValue]:
        (current[dayValue] || []).length > 0 ? [] : [{ startTime: '09:00', endTime: '17:00' }],
    }));
  };

  const handleSaveWeeklyHours = async () => {
    if (!selectedSchedule) {
      return;
    }

    const rules = flattenRulesByDay(draftRulesByDay);
    await saveRulesMutation.mutateAsync({ id: selectedSchedule.id, rules });
  };

  const handleSaveOverride = async () => {
    if (!selectedSchedule) {
      return;
    }

    await saveOverrideMutation.mutateAsync({
      scheduleId: selectedSchedule.id,
      overrideId: existingOverride?.id,
      payload: {
        overrideDate: `${selectedDateKey}T00:00:00.000Z`,
        isAvailable: overrideDraft.isAvailable,
        startTime: overrideDraft.isAvailable ? overrideDraft.startTime : undefined,
        endTime: overrideDraft.isAvailable ? overrideDraft.endTime : undefined,
        note: overrideDraft.note,
      },
    });
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Availability schedules</h2>
            <p>Manage weekly hours, timezones, and date-specific exceptions.</p>
          </div>
          <button type="button" className="primary-button" onClick={handleSaveWeeklyHours}>
            Save weekly hours
          </button>
        </div>

        {statusMessage ? <div className="page-message">{statusMessage}</div> : null}

        <div className="availability-toolbar">
          <label className="field">
            <span>Timezone</span>
            <select
              value={me.timezone}
              onChange={(event) =>
                updateMeMutation.mutate({
                  timezone: event.target.value,
                })
              }
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </label>

          <div className="field field--grow">
            <span>Create schedule</span>
            <div className="inline-form">
              <input
                value={newScheduleName}
                onChange={(event) => setNewScheduleName(event.target.value)}
                placeholder="Working hours"
              />
              <button
                type="button"
                className="outline-button"
                disabled={!newScheduleName.trim()}
                onClick={() =>
                  createScheduleMutation.mutate({
                    name: newScheduleName.trim(),
                    isDefault: schedules.length === 0,
                  })
                }
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {schedulesQuery.isLoading ? (
          <PageLoader label="Loading schedules..." />
        ) : selectedSchedule ? (
          <>
            <div className="schedule-switcher">
              {schedules.map((schedule) => (
                <button
                  key={schedule.id}
                  type="button"
                  className={`schedule-pill ${schedule.id === selectedSchedule.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedScheduleId(schedule.id)}
                >
                  <span>{schedule.name}</span>
                  {schedule.isDefault ? <small>Default</small> : null}
                </button>
              ))}
            </div>

            <div className="schedule-actions">
              {!selectedSchedule.isDefault ? (
                <button
                  type="button"
                  className="outline-button"
                  onClick={() =>
                    updateScheduleMutation.mutate({
                      id: selectedSchedule.id,
                      payload: { isDefault: true },
                    })
                  }
                >
                  Make default
                </button>
              ) : null}

              {schedules.length > 1 ? (
                <button
                  type="button"
                  className="outline-button outline-button--danger"
                  onClick={() => deleteScheduleMutation.mutate(selectedSchedule.id)}
                >
                  Delete schedule
                </button>
              ) : null}
            </div>

            <div className="hours-list">
              {DAY_ROWS.map((day) => {
                const blocks = draftRulesByDay[day.value] || [];
                return (
                  <div key={day.value} className="hours-row">
                    <div className="hours-row__label">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={blocks.length > 0}
                          onChange={() => toggleDay(day.value)}
                        />
                        <span>{day.label}</span>
                      </label>
                    </div>

                    <div className="hours-row__blocks">
                      {blocks.length === 0 ? (
                        <span className="text-muted">Unavailable</span>
                      ) : (
                        blocks.map((block, index) => (
                          <div key={`${day.value}-${index}`} className="time-block">
                            <input
                              type="time"
                              value={block.startTime}
                              onChange={(event) =>
                                updateBlock(day.value, index, 'startTime', event.target.value)
                              }
                            />
                            <span>to</span>
                            <input
                              type="time"
                              value={block.endTime}
                              onChange={(event) =>
                                updateBlock(day.value, index, 'endTime', event.target.value)
                              }
                            />
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => removeBlock(day.value, index)}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}

                      <button type="button" className="text-link" onClick={() => addBlock(day.value)}>
                        <Plus size={14} style={{ marginRight: '4px', display: 'inline-block' }} /> Add hours
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EmptyState
            title="No schedules yet"
            description="Create a schedule to configure your weekly hours."
          />
        )}
      </section>

      <div className="split-panels">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Date-specific hours</h2>
              <p>Override your weekly schedule for vacations, travel, or one-off shifts.</p>
            </div>
          </div>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(value) => value && setSelectedDate(value)}
            className="calendar-surface"
          />
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{format(selectedDate, 'EEEE, MMMM d')}</h2>
              <p>Choose whether this date is available and, if so, define one special-hours window.</p>
            </div>
            <button type="button" className="primary-button" onClick={handleSaveOverride}>
              Save override
            </button>
          </div>

          <div className="override-form">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={overrideDraft.isAvailable}
                onChange={(event) =>
                  setOverrideDraft((current) => ({
                    ...current,
                    isAvailable: event.target.checked,
                  }))
                }
              />
              <span>Available on this date</span>
            </label>

            {overrideDraft.isAvailable ? (
              <div className="override-form__times">
                <label className="field">
                  <span>Start</span>
                  <input
                    type="time"
                    value={overrideDraft.startTime}
                    onChange={(event) =>
                      setOverrideDraft((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>End</span>
                  <input
                    type="time"
                    value={overrideDraft.endTime}
                    onChange={(event) =>
                      setOverrideDraft((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Note</span>
              <textarea
                rows="3"
                value={overrideDraft.note}
                onChange={(event) =>
                  setOverrideDraft((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Optional note for this override"
              />
            </label>
          </div>

          <div className="override-list">
            <h3>Saved overrides</h3>
            {(selectedSchedule?.overrides || []).length === 0 ? (
              <p className="text-muted">No date-specific overrides yet.</p>
            ) : (
              (selectedSchedule?.overrides || []).map((override) => (
                <div key={override.id} className="override-item">
                  <div>
                    <strong>
                      {format(parseISO(override.overrideDate), 'EEE, MMM d, yyyy')}
                    </strong>
                    <p>
                      {override.isAvailable
                        ? `${override.startTime} - ${override.endTime}`
                        : 'Unavailable all day'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-link text-link--danger"
                    onClick={() => deleteOverrideMutation.mutate(override.id)}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
