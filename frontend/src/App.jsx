import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DayPicker } from 'react-day-picker';
import {
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  buildPublicBookingPath,
  buildPublicBookingUrl,
  cancelMeeting,
  createEventType,
  createOverride,
  createPublicBooking,
  createSchedule,
  deleteEventType,
  deleteOverride,
  deleteSchedule,
  getApiErrorMessage,
  getCurrentUser,
  getMeeting,
  getMonthAvailability,
  getPublicEventInfo,
  getPublicSlots,
  listEventTypes,
  listMeetings,
  listSchedules,
  replaceScheduleRules,
  rescheduleMeeting,
  slugifyValue,
  updateCurrentUser,
  updateEventType,
  updateSchedule,
} from './api.js';
import horizontalLogo from './assets/calendly_logo_horizontal_color.svg';
import brandMark from './assets/calendly_brand mark_color.svg';
import './App.css';

const DAY_ROWS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const CORE_ROUTES = [
  { label: 'Scheduling', to: '/app/scheduling', icon: 'link' },
  { label: 'Meetings', to: '/app/meetings', icon: 'calendar' },
  { label: 'Availability', to: '/app/availability', icon: 'clock' },
];

const EXTRA_ROUTES = [
  { label: 'Contacts', to: '/app/contacts', icon: 'users' },
  { label: 'Workflows', to: '/app/workflows', icon: 'spark' },
  { label: 'Integrations & apps', to: '/app/integrations', icon: 'grid' },
  { label: 'Routing', to: '/app/routing', icon: 'swap' },
  { label: 'Analytics', to: '/app/analytics', icon: 'chart' },
  { label: 'Admin center', to: '/app/admin', icon: 'shield' },
];

const EVENT_ACCENTS = ['#8247F5', '#0AE8F0', '#006BFF', '#FF6B35', '#13C296', '#E756B5'];
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
const MEETING_MODE_LABELS = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  in_person: 'In person',
  phone: 'Phone call',
};

const CONFIRMATION_STORAGE_KEY = 'calendly-clone-confirmation';

function getRouteTitle(pathname) {
  if (pathname.startsWith('/app/scheduling')) return 'Scheduling';
  if (pathname.startsWith('/app/meetings')) return 'Meetings';
  if (pathname.startsWith('/app/availability')) return 'Availability';
  if (pathname.startsWith('/app/contacts')) return 'Contacts';
  if (pathname.startsWith('/app/workflows')) return 'Workflows';
  if (pathname.startsWith('/app/integrations')) return 'Integrations & apps';
  if (pathname.startsWith('/app/routing')) return 'Routing';
  if (pathname.startsWith('/app/analytics')) return 'Analytics';
  if (pathname.startsWith('/app/admin')) return 'Admin center';
  return 'Calendly Clone';
}

function getEventAccent(seed) {
  const hash = [...seed].reduce((total, char) => total + char.charCodeAt(0), 0);
  return EVENT_ACCENTS[hash % EVENT_ACCENTS.length];
}

function createRulesByDay(rules = []) {
  const grouped = DAY_ROWS.reduce((accumulator, day) => {
    accumulator[day.value] = [];
    return accumulator;
  }, {});

  rules.forEach((rule) => {
    grouped[rule.dayOfWeek] = grouped[rule.dayOfWeek] || [];
    grouped[rule.dayOfWeek].push({
      startTime: rule.startTime,
      endTime: rule.endTime,
    });
  });

  return grouped;
}

function flattenRulesByDay(rulesByDay) {
  return DAY_ROWS.flatMap((day) =>
    (rulesByDay[day.value] || [])
      .filter((entry) => entry.startTime && entry.endTime)
      .map((entry) => ({
        dayOfWeek: day.value,
        startTime: entry.startTime,
        endTime: entry.endTime,
      }))
  );
}

function formatDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

function formatDateInTimezone(value, timezone, pattern) {
  return formatInTimeZone(new Date(value), timezone, pattern);
}

function readConfirmationRecord() {
  try {
    const value = sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function storeConfirmationRecord(record) {
  sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(record));
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/scheduling" replace />} />
      <Route path="/app" element={<AdminShell />}>
        <Route index element={<Navigate to="scheduling" replace />} />
        <Route path="scheduling" element={<SchedulingPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route
          path="contacts"
          element={<PlaceholderPage title="Contacts" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="workflows"
          element={<PlaceholderPage title="Workflows" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="integrations"
          element={<PlaceholderPage title="Integrations & apps" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="routing"
          element={<PlaceholderPage title="Routing" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="analytics"
          element={<PlaceholderPage title="Analytics" description="Static shell replica queued for the final polish pass." />}
        />
        <Route
          path="admin"
          element={<PlaceholderPage title="Admin center" description="Static shell replica queued for the final polish pass." />}
        />
      </Route>
      <Route path="/:username/:slug/confirmation" element={<BookingConfirmationPage />} />
      <Route path="/:username/:slug" element={<PublicBookingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getCurrentUser,
  });

  if (meQuery.isLoading) {
    return <PageLoader label="Loading your scheduling workspace..." />;
  }

  if (meQuery.isError) {
    return (
      <CenteredState
        title="We couldn't load your workspace."
        description={getApiErrorMessage(meQuery.error, 'The admin shell could not connect to the backend.')}
      />
    );
  }

  const me = meQuery.data;
  const pageTitle = getRouteTitle(location.pathname);

  return (
    <div className={`dashboard-shell ${sidebarExpanded ? 'dashboard-shell--expanded' : 'dashboard-shell--collapsed'}`}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src={horizontalLogo} alt="Calendly" className="sidebar__logo sidebar__logo--full" />
          <img src={brandMark} alt="Calendly" className="sidebar__logo sidebar__logo--mark" />
          <button
            type="button"
            className="icon-button sidebar__collapse"
            onClick={() => setSidebarExpanded((current) => !current)}
            aria-label={sidebarExpanded ? 'Collapse navigation' : 'Expand navigation'}
          >
            {sidebarExpanded ? '«' : '»'}
          </button>
        </div>

        <button
          type="button"
          className="outline-button sidebar__create"
          onClick={() => navigate('/app/scheduling?create=1')}
        >
          <span className="sidebar__create-plus">+</span>
          <span>Create</span>
        </button>

        <nav className="sidebar__nav">
          {[...CORE_ROUTES, ...EXTRA_ROUTES].map((item) => (
            <NavLink key={item.to} to={item.to} className="sidebar__link">
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <button type="button" className="sidebar__upgrade">
            Upgrade plan
          </button>
          <button type="button" className="sidebar__support">
            Help
          </button>
        </div>
      </aside>

      <div className="shell-content">
        <header className="shell-header">
          <div>
            <p className="shell-header__eyebrow">Account details</p>
            <h1 className="shell-header__title">{pageTitle}</h1>
          </div>

          <div className="shell-header__actions">
            <button
              type="button"
              className="primary-button shell-header__create"
              onClick={() => navigate('/app/scheduling?create=1')}
            >
              + Create
            </button>
            <button type="button" className="icon-button">
              <SidebarIcon name="users" />
            </button>
            <div className="user-chip">
              <span>{me.name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{me.name}</strong>
                <small>@{me.username || 'setup-required'}</small>
              </div>
            </div>
          </div>
        </header>

        <main className="shell-main">
          <Outlet context={{ me }} />
        </main>
      </div>

      <nav className="mobile-nav">
        {CORE_ROUTES.map((item) => (
          <NavLink key={item.to} to={item.to} className="mobile-nav__link">
            <SidebarIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button type="button" className="floating-help" aria-label="Open help">
        ?
      </button>
    </div>
  );
}

function SchedulingPage() {
  const { me } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('event-types');
  const [statusMessage, setStatusMessage] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuEventId, setMenuEventId] = useState(null);
  const deferredSearch = useDeferredValue(searchTerm);

  const eventTypesQuery = useQuery({
    queryKey: ['event-types'],
    queryFn: listEventTypes,
  });

  const createMutation = useMutation({
    mutationFn: createEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      setStatusMessage('Event type created.');
      setModalOpen(false);
      setEditingEvent(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateEventType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      setStatusMessage('Event type updated.');
      setModalOpen(false);
      setEditingEvent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-types'] });
      setStatusMessage('Event type turned off.');
    },
  });

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setEditingEvent(null);
      setModalOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('create');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredEventTypes = useMemo(() => {
    const events = eventTypesQuery.data || [];
    if (!deferredSearch.trim()) {
      return events;
    }

    const needle = deferredSearch.toLowerCase();
    return events.filter((eventType) =>
      [eventType.title, eventType.slug, eventType.description || '']
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [deferredSearch, eventTypesQuery.data]);

  const createDuplicate = async (eventType) => {
    const duplicateSlug = `${eventType.slug}-${Date.now().toString().slice(-4)}`;
    await createMutation.mutateAsync({
      title: `${eventType.title} Copy`,
      slug: duplicateSlug,
      durationMinutes: eventType.durationMinutes,
      description: eventType.description || '',
      meetingMode: eventType.meetingMode,
      bufferBeforeMin: eventType.bufferBeforeMin,
      bufferAfterMin: eventType.bufferAfterMin,
    });
  };

  const handleModalSubmit = async (payload) => {
    if (editingEvent) {
      await updateMutation.mutateAsync({
        id: editingEvent.id,
        payload,
      });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  const handleToggle = async (eventType) => {
    await updateMutation.mutateAsync({
      id: eventType.id,
      payload: { isActive: !eventType.isActive },
    });
  };

  const handleCopyLink = async (eventType) => {
    if (!me.username) {
      setStatusMessage('Set a username in Availability before copying booking links.');
      return;
    }

    await navigator.clipboard.writeText(buildPublicBookingUrl(me.username, eventType.slug));
    setStatusMessage('Booking link copied to clipboard.');
  };

  return (
    <div className="page-with-sidebar">
      <section className="panel">
        <div className="subtabs">
          {[
            { key: 'event-types', label: 'Event types' },
            { key: 'single-use', label: 'Single-use links' },
            { key: 'polls', label: 'Meeting polls' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`subtabs__button ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="panel-toolbar">
          <div className="search-field">
            <span className="search-field__icon">
              <SidebarIcon name="search" />
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search event types"
            />
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setEditingEvent(null);
              setModalOpen(true);
            }}
          >
            + Create
          </button>
        </div>

        {statusMessage ? <div className="page-message">{statusMessage}</div> : null}

        <div className="host-row">
          <div className="host-row__identity">
            <div className="avatar-circle">{me.name.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{me.name}</strong>
              <small>Default booking hub</small>
            </div>
          </div>

          {me.username ? (
            <a
              className="text-link"
              href={buildPublicBookingPath(me.username, filteredEventTypes[0]?.slug || '15-min-chat')}
              target="_blank"
              rel="noreferrer"
            >
              View landing page
            </a>
          ) : null}
        </div>

        {activeTab !== 'event-types' ? (
          <EmptyState
            title="This surface is queued for the final replica pass."
            description="The core assignment flows are fully prioritized first. Static shell replicas for this tab come next."
          />
        ) : eventTypesQuery.isLoading ? (
          <PageLoader label="Loading event types..." />
        ) : eventTypesQuery.isError ? (
          <EmptyState
            title="We couldn't load event types."
            description={getApiErrorMessage(eventTypesQuery.error, 'The scheduling page could not reach the backend.')}
          />
        ) : filteredEventTypes.length === 0 ? (
          <EmptyState
            title="No event types yet"
            description="Create your first meeting template to start sharing booking links."
            actionLabel="Create event type"
            onAction={() => {
              setEditingEvent(null);
              setModalOpen(true);
            }}
          />
        ) : (
          <div className="event-grid">
            {filteredEventTypes.map((eventType) => {
              const accent = getEventAccent(eventType.id);
              const publicUrl =
                me.username && buildPublicBookingUrl(me.username, eventType.slug);

              return (
                <article key={eventType.id} className="event-card" style={{ '--event-accent': accent }}>
                  <div className="event-card__header">
                    <div>
                      <h3>{eventType.title}</h3>
                      <p>
                        {eventType.durationMinutes} min • {MEETING_MODE_LABELS[eventType.meetingMode]}
                      </p>
                    </div>

                    <div className="event-card__menu">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() =>
                          setMenuEventId((current) => (current === eventType.id ? null : eventType.id))
                        }
                      >
                        ⋯
                      </button>

                      {menuEventId === eventType.id ? (
                        <div className="dropdown-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEvent(eventType);
                              setModalOpen(true);
                              setMenuEventId(null);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await createDuplicate(eventType);
                              setMenuEventId(null);
                            }}
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await deleteMutation.mutateAsync(eventType.id);
                              setMenuEventId(null);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <p className="event-card__description">
                    {eventType.description || 'Uses your default availability schedule and booking preferences.'}
                  </p>

                  <div className="event-card__pill-row">
                    <span className="pill">{MEETING_MODE_LABELS[eventType.meetingMode]}</span>
                    <span className="pill">
                      Buffers {eventType.bufferBeforeMin}/{eventType.bufferAfterMin}
                    </span>
                  </div>

                  <div className="event-card__actions">
                    <button type="button" className="outline-button" onClick={() => handleCopyLink(eventType)}>
                      Copy link
                    </button>
                    {publicUrl ? (
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="text-link">
                        View booking page
                      </a>
                    ) : (
                      <span className="text-muted">Set your username to generate links</span>
                    )}
                  </div>

                  <div className="event-card__footer">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={eventType.isActive}
                        onChange={() => handleToggle(eventType)}
                      />
                      <span className="switch__track" />
                      <span>{eventType.isActive ? 'On' : 'Off'}</span>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <aside className="panel onboarding-panel">
        <div className="onboarding-panel__header">
          <h2>Get started</h2>
        </div>
        {[
          ['Get to know Calendly', '1 video'],
          ['The perfect scheduling setup', '2 tasks'],
          ['Automate meeting prep and follow-up', '2 tasks'],
          ['Using Calendly with a team', '2 tasks'],
        ].map(([title, subtitle]) => (
          <div key={title} className="onboarding-item">
            <div className="onboarding-item__icon" />
            <div>
              <strong>{title}</strong>
              <span>{subtitle}</span>
            </div>
          </div>
        ))}
      </aside>

      <EventTypeModal
        open={modalOpen}
        initialValue={editingEvent}
        submitting={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setModalOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}

function AvailabilityPage() {
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
                        + Add hours
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

function MeetingsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);

  const meetingsQuery = useQuery({
    queryKey: ['meetings', status],
    queryFn: () => listMeetings(status),
  });

  const detailQuery = useQuery({
    queryKey: ['meeting', selectedMeetingId],
    queryFn: () => getMeeting(selectedMeetingId),
    enabled: Boolean(selectedMeetingId),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelMeeting(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', selectedMeetingId] });
      setStatusMessage('Meeting cancelled.');
      setCancelModalOpen(false);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => rescheduleMeeting(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', selectedMeetingId] });
      setStatusMessage('Meeting rescheduled.');
      setRescheduleModalOpen(false);
    },
  });

  const filteredMeetings = useMemo(() => {
    const meetings = meetingsQuery.data || [];
    if (!deferredSearch.trim()) {
      return meetings;
    }

    const needle = deferredSearch.toLowerCase();
    return meetings.filter((meeting) =>
      [meeting.eventType?.title, meeting.inviteeName, meeting.inviteeEmail]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [deferredSearch, meetingsQuery.data]);

  useEffect(() => {
    if (!selectedMeetingId && filteredMeetings[0]?.id) {
      setSelectedMeetingId(filteredMeetings[0].id);
    }
  }, [filteredMeetings, selectedMeetingId]);

  const selectedMeeting = detailQuery.data;

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-toolbar">
          <div className="segmented-control">
            {[
              { key: 'upcoming', label: 'Upcoming' },
              { key: 'past', label: 'Past' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={status === tab.key ? 'is-active' : ''}
                onClick={() => {
                  setStatus(tab.key);
                  setSelectedMeetingId('');
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="panel-toolbar__actions">
            <div className="search-field search-field--compact">
              <span className="search-field__icon">
                <SidebarIcon name="search" />
              </span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search meetings"
              />
            </div>
            <button type="button" className="outline-button">
              Export
            </button>
            <button type="button" className="outline-button">
              Filter
            </button>
          </div>
        </div>

        {statusMessage ? <div className="page-message">{statusMessage}</div> : null}

        {meetingsQuery.isLoading ? (
          <PageLoader label="Loading meetings..." />
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Share event type links to begin collecting meetings."
          />
        ) : (
          <div className="meetings-layout">
            <div className="meeting-list">
              {filteredMeetings.map((meeting) => {
                const isSelected = meeting.id === selectedMeetingId;
                return (
                  <button
                    key={meeting.id}
                    type="button"
                    className={`meeting-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedMeetingId(meeting.id)}
                  >
                    <div>
                      <strong>{meeting.eventType?.title}</strong>
                      <p>{meeting.inviteeName}</p>
                    </div>
                    <div className="meeting-row__meta">
                      <span>{formatDateInTimezone(meeting.startAt, meeting.host?.timezone || 'UTC', 'EEE, MMM d')}</span>
                      <small>{formatDateInTimezone(meeting.startAt, meeting.host?.timezone || 'UTC', 'h:mm a')}</small>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="meeting-detail">
              {detailQuery.isLoading ? (
                <PageLoader label="Loading meeting details..." />
              ) : selectedMeeting ? (
                <>
                  <div className="meeting-detail__header">
                    <div>
                      <h2>{selectedMeeting.eventType?.title}</h2>
                      <p>
                        {selectedMeeting.inviteeName} • {selectedMeeting.inviteeEmail}
                      </p>
                    </div>
                    <span className={`status-badge status-badge--${selectedMeeting.status.toLowerCase()}`}>
                      {selectedMeeting.status.toLowerCase()}
                    </span>
                  </div>

                  <dl className="detail-grid">
                    <div>
                      <dt>When</dt>
                      <dd>
                        {formatDateInTimezone(
                          selectedMeeting.startAt,
                          selectedMeeting.host?.timezone || 'UTC',
                          "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Host</dt>
                      <dd>{selectedMeeting.host?.name}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{MEETING_MODE_LABELS[selectedMeeting.meetingMode || selectedMeeting.eventType?.meetingMode] || 'Meeting'}</dd>
                    </div>
                    <div>
                      <dt>Public path</dt>
                      <dd>
                        {selectedMeeting.host?.username
                          ? `${selectedMeeting.host.username}/${selectedMeeting.eventType?.slug}`
                          : selectedMeeting.eventType?.slug}
                      </dd>
                    </div>
                  </dl>

                  {selectedMeeting.cancellationReason ? (
                    <div className="detail-note detail-note--warning">
                      <strong>Cancellation reason</strong>
                      <p>{selectedMeeting.cancellationReason}</p>
                    </div>
                  ) : null}

                  <div className="detail-note">
                    <strong>Questions & answers</strong>
                    {(selectedMeeting.questions || []).length === 0 ? (
                      <p>No custom questions were answered.</p>
                    ) : (
                      (selectedMeeting.questions || []).map((question) => (
                        <div key={question.id} className="qa-row">
                          <span>{question.questionText}</span>
                          <p>{question.answer?.answerText || 'No answer provided.'}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {selectedMeeting.status === 'SCHEDULED' ? (
                    <div className="detail-actions">
                      <button type="button" className="outline-button" onClick={() => setRescheduleModalOpen(true)}>
                        Reschedule
                      </button>
                      <button type="button" className="outline-button outline-button--danger" onClick={() => setCancelModalOpen(true)}>
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <EmptyState
                  title="Select a meeting"
                  description="Pick a meeting from the list to view details, cancel it, or reschedule it."
                />
              )}
            </div>
          </div>
        )}
      </section>

      <CancelMeetingModal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onSubmit={(reason) => cancelMutation.mutate({ id: selectedMeetingId, reason })}
        submitting={cancelMutation.isPending}
      />

      <RescheduleModal
        open={rescheduleModalOpen}
        meeting={selectedMeeting}
        submitting={rescheduleMutation.isPending}
        onClose={() => setRescheduleModalOpen(false)}
        onConfirm={(slot) =>
          rescheduleMutation.mutate({
            id: selectedMeetingId,
            payload: {
              startUtc: slot.startUtc,
              endUtc: slot.endUtc,
            },
          })
        }
      />
    </div>
  );
}

function PublicBookingPage() {
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

function BookingConfirmationPage() {
  const { username, slug } = useParams();
  const record = readConfirmationRecord();

  if (!record || record.username !== username || record.slug !== slug) {
    return (
      <CenteredState
        title="No recent booking found"
        description="The confirmation page relies on the most recent successful booking from this browser session."
      />
    );
  }

  return (
    <div className="public-booking-shell">
      <div className="confirmation-card">
        <img src={horizontalLogo} alt="Calendly" className="confirmation-card__logo" />
        <span className="confirmation-badge">Confirmed</span>
        <h1>Your meeting is scheduled</h1>
        <p>
          {record.booking.inviteeName}, you're booked with {record.eventType.user?.name}.
        </p>

        <div className="confirmation-grid">
          <div>
            <dt>Event</dt>
            <dd>{record.booking.eventType?.title || record.eventType.title}</dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>
              {formatDateInTimezone(
                record.booking.startAt,
                record.timezone,
                "EEEE, MMMM d, yyyy 'at' h:mm a zzz"
              )}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{record.booking.inviteeEmail}</dd>
          </div>
          <div>
            <dt>Host</dt>
            <dd>{record.booking.host?.name || record.eventType.user?.name}</dd>
          </div>
        </div>

        <div className="confirmation-actions">
          <a href={buildPublicBookingPath(username, slug)} className="outline-button">
            Book another time
          </a>
          <a href="/app/meetings" className="primary-button">
            Go to meetings
          </a>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <section className="panel">
      <EmptyState title={title} description={description} />
    </section>
  );
}

function NotFoundPage() {
  return (
    <CenteredState
      title="This page does not exist"
      description="Use the admin shell or a valid booking link to continue."
    />
  );
}

function SlotPickerPanel({
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
              <PageLoader label="Loading times..." compact />
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
          <PageLoader label="Loading month availability..." compact />
        ) : (
          <p className="text-muted">Select a highlighted date to view available time blocks.</p>
        )}
      </div>
    </div>
  );
}

function EventTypeModal({ open, initialValue, submitting, onClose, onSubmit }) {
  const [formState, setFormState] = useState({
    title: '',
    slug: '',
    durationMinutes: '30',
    description: '',
    meetingMode: 'google_meet',
    bufferBeforeMin: '0',
    bufferAfterMin: '0',
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialValue) {
      setFormState({
        title: initialValue.title,
        slug: initialValue.slug,
        durationMinutes: String(initialValue.durationMinutes),
        description: initialValue.description || '',
        meetingMode: initialValue.meetingMode,
        bufferBeforeMin: String(initialValue.bufferBeforeMin),
        bufferAfterMin: String(initialValue.bufferAfterMin),
      });
      setSlugTouched(true);
      return;
    }

    setFormState({
      title: '',
      slug: '',
      durationMinutes: '30',
      description: '',
      meetingMode: 'google_meet',
      bufferBeforeMin: '0',
      bufferAfterMin: '0',
    });
    setSlugTouched(false);
  }, [initialValue, open]);

  if (!open) {
    return null;
  }

  return (
    <ModalFrame title={initialValue ? 'Edit event type' : 'Create event type'} onClose={onClose}>
      <form
        className="modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            title: formState.title.trim(),
            slug: formState.slug.trim(),
            durationMinutes: Number(formState.durationMinutes),
            description: formState.description.trim(),
            meetingMode: formState.meetingMode,
            bufferBeforeMin: Number(formState.bufferBeforeMin),
            bufferAfterMin: Number(formState.bufferAfterMin),
          });
        }}
      >
        <label className="field">
          <span>Event name</span>
          <input
            required
            value={formState.title}
            onChange={(event) => {
              const title = event.target.value;
              setFormState((current) => ({
                ...current,
                title,
                slug: slugTouched ? current.slug : slugifyValue(title),
              }));
            }}
          />
        </label>

        <label className="field">
          <span>URL slug</span>
          <input
            required
            value={formState.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setFormState((current) => ({
                ...current,
                slug: slugifyValue(event.target.value),
              }));
            }}
          />
        </label>

        <div className="split-fields">
          <label className="field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="5"
              max="480"
              value={formState.durationMinutes}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  durationMinutes: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Meeting type</span>
            <select
              value={formState.meetingMode}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  meetingMode: event.target.value,
                }))
              }
            >
              {Object.entries(MEETING_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows="4"
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
        </label>

        <div className="split-fields">
          <label className="field">
            <span>Buffer before</span>
            <input
              type="number"
              min="0"
              max="120"
              value={formState.bufferBeforeMin}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  bufferBeforeMin: event.target.value,
                }))
              }
            />
          </label>

          <label className="field">
            <span>Buffer after</span>
            <input
              type="number"
              min="0"
              max="120"
              value={formState.bufferAfterMin}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  bufferAfterMin: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {initialValue ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

function CancelMeetingModal({ open, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <ModalFrame title="Cancel meeting" onClose={onClose}>
      <div className="stack stack--tight">
        <p>Let the invitee know why this meeting is being cancelled.</p>
        <label className="field">
          <span>Reason</span>
          <textarea rows="4" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="outline-button" onClick={onClose}>
            Keep meeting
          </button>
          <button
            type="button"
            className="outline-button outline-button--danger"
            disabled={submitting}
            onClick={() => onSubmit(reason)}
          >
            Cancel meeting
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function RescheduleModal({ open, meeting, submitting, onClose, onConfirm }) {
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

function ModalFrame({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-frame ${wide ? 'modal-frame--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state__illustration" />
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel ? (
        <button type="button" className="primary-button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function PageLoader({ label, compact = false }) {
  return (
    <div className={`loader ${compact ? 'loader--compact' : ''}`}>
      <div className="loader__spinner" />
      <span>{label}</span>
    </div>
  );
}

function CenteredState({ title, description }) {
  return (
    <div className="centered-state">
      <img src={brandMark} alt="Calendly" />
      <h1>{title}</h1>
      <p>{description}</p>
      <a href="/app/scheduling" className="primary-button">
        Back to app
      </a>
    </div>
  );
}

function SidebarIcon({ name }) {
  switch (name) {
    case 'calendar':
      return <span className="icon-glyph">▦</span>;
    case 'clock':
      return <span className="icon-glyph">◷</span>;
    case 'users':
      return <span className="icon-glyph">◔</span>;
    case 'spark':
      return <span className="icon-glyph">✦</span>;
    case 'grid':
      return <span className="icon-glyph">⊞</span>;
    case 'swap':
      return <span className="icon-glyph">⇄</span>;
    case 'chart':
      return <span className="icon-glyph">◫</span>;
    case 'shield':
      return <span className="icon-glyph">⬡</span>;
    case 'search':
      return <span className="icon-glyph">⌕</span>;
    case 'link':
      return <span className="icon-glyph">↗</span>;
    default:
      return <span className="icon-glyph">•</span>;
  }
}

export default App;
