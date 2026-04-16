import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { createPublicBooking, getApiErrorMessage, getPublicEventInfo } from '../api.js';
import { COMMON_TIMEZONES, MEETING_MODE_LABELS } from '../constants.js';
import { formatDateInTimezone, storeConfirmationRecord } from '../utils/helpers.js';
import horizontalLogo from '../assets/calendly_logo_horizontal_color.svg';
import PageLoader from '../components/ui/PageLoader.jsx';
import CenteredState from '../components/ui/CenteredState.jsx';
import SlotPickerPanel from '../components/public/SlotPickerPanel.jsx';

export default function PublicBookingPage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [timezone, setTimezone] = useState(detectedTimezone);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [nameMode, setNameMode] = useState('single');
  const [formState, setFormState] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    notes: '',
  });

  const eventInfoQuery = useQuery({
    queryKey: ['public-event', username, slug],
    queryFn: () => getPublicEventInfo(username, slug),
  });

  const bookingMutation = useMutation({
    mutationFn: (payload) => createPublicBooking(username, slug, payload),
    onSuccess: (booking) => {
      storeConfirmationRecord({
        username,
        slug,
        timezone,
        booking,
        eventType: eventInfoQuery.data,
      });
      navigate(`/${username}/${slug}/confirmation`);
    },
  });

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSlot) {
      return;
    }

    const inviteeName =
      nameMode === 'single'
        ? formState.fullName.trim()
        : `${formState.firstName} ${formState.lastName}`.trim();

    await bookingMutation.mutateAsync({
      inviteeName,
      inviteeEmail: formState.email.trim(),
      startUtc: selectedSlot.startUtc,
      endUtc: selectedSlot.endUtc,
      responses: formState.notes.trim()
        ? [
            {
              question: 'Anything else we should know before the meeting?',
              answer: formState.notes.trim(),
              sortOrder: 1,
              isRequired: false,
            },
          ]
        : [],
    });
  };

  if (eventInfoQuery.isLoading) {
    return <PageLoader label="Loading booking page..." />;
  }

  if (eventInfoQuery.isError) {
    return (
      <CenteredState
        title="This booking page could not be found."
        description={getApiErrorMessage(eventInfoQuery.error, 'Check the username and event slug, then try again.')}
      />
    );
  }

  const eventType = eventInfoQuery.data;
  const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
    ? COMMON_TIMEZONES
    : [timezone, ...COMMON_TIMEZONES];

  return (
    <div className="public-booking-shell">
      <div className="public-booking-card">
        <aside className="public-booking-sidebar">
          <img src={horizontalLogo} alt="Calendly" className="public-booking-sidebar__logo" />
          <div className="public-booking-sidebar__host">
            <div className="avatar-circle avatar-circle--large">
              {eventType.user?.name?.charAt(0).toUpperCase()}
            </div>
            <p>{eventType.user?.name}</p>
          </div>
          <h1>{eventType.title}</h1>
          <ul className="public-booking-sidebar__facts">
            <li>{eventType.durationMinutes} minute meeting</li>
            <li>{MEETING_MODE_LABELS[eventType.meetingMode]}</li>
            <li>{eventType.description || 'Choose a time that works and we will lock it in instantly.'}</li>
          </ul>
        </aside>

        <section className="public-booking-main">
          {!selectedSlot ? (
            <>
              <div className="public-booking-main__header">
                <div>
                  <p className="shell-header__eyebrow">Select a date & time</p>
                  <h2>Pick an available slot</h2>
                </div>
                <label className="field field--compact">
                  <span>Timezone</span>
                  <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
                    {timezoneOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <SlotPickerPanel
                username={username}
                slug={slug}
                timezone={timezone}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSelectDate={setSelectedDate}
                onSelectSlot={setSelectedSlot}
              />
            </>
          ) : (
            <div className="booking-form-layout">
              <div className="booking-form-layout__summary">
                <h2>{eventType.title}</h2>
                <p>{eventType.user?.name}</p>
                <div className="pill-stack">
                  <span className="pill">
                    {formatDateInTimezone(selectedSlot.startUtc, timezone, "EEEE, MMM d")}
                  </span>
                  <span className="pill">
                    {formatDateInTimezone(selectedSlot.startUtc, timezone, "h:mm a")} ({timezone})
                  </span>
                </div>
                <button type="button" className="text-link" onClick={() => setSelectedSlot(null)}>
                  Back to times
                </button>
              </div>

              <form className="booking-form" onSubmit={handleBookingSubmit}>
                <div className="booking-form__toggle">
                  <button
                    type="button"
                    className={nameMode === 'single' ? 'is-active' : ''}
                    onClick={() => setNameMode('single')}
                  >
                    Single field
                  </button>
                  <button
                    type="button"
                    className={nameMode === 'split' ? 'is-active' : ''}
                    onClick={() => setNameMode('split')}
                  >
                    First & last
                  </button>
                </div>

                {nameMode === 'single' ? (
                  <label className="field">
                    <span>Name</span>
                    <input
                      required
                      value={formState.fullName}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </label>
                ) : (
                  <div className="split-fields">
                    <label className="field">
                      <span>First name</span>
                      <input
                        required
                        value={formState.firstName}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, firstName: event.target.value }))
                        }
                      />
                    </label>
                    <label className="field">
                      <span>Last name</span>
                      <input
                        required
                        value={formState.lastName}
                        onChange={(event) =>
                          setFormState((current) => ({ ...current, lastName: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                )}

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    required
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </label>

                <label className="field">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={formState.notes}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder="Share anything that would help before the meeting."
                  />
                </label>

                {bookingMutation.isError ? (
                  <div className="detail-note detail-note--warning">
                    <p>{getApiErrorMessage(bookingMutation.error, 'The booking could not be created.')}</p>
                  </div>
                ) : null}

                <button type="submit" className="primary-button" disabled={bookingMutation.isPending}>
                  Confirm booking
                </button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
