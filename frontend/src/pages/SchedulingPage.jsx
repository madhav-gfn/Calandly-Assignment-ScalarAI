import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Plus, Link2 } from 'lucide-react';
import {
  buildPublicBookingPath,
  buildPublicBookingUrl,
  createEventType,
  deleteEventType,
  getApiErrorMessage,
  listEventTypes,
  updateEventType,
} from '../api.js';
import { MEETING_MODE_LABELS } from '../constants.js';
import { getEventAccent } from '../utils/helpers.js';
import SidebarIcon from '../components/ui/SidebarIcon.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import EventTypeModal from '../components/modals/EventTypeModal.jsx';

export default function SchedulingPage() {
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
            <Plus size={16} strokeWidth={2.5} style={{ marginRight: '4px', display: 'inline' }} /> Create
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
              View booking page
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
                <article key={eventType.id} className="event-card event-card--horizontal" style={{ '--event-accent': accent, zIndex: menuEventId === eventType.id ? 50 : undefined }}>
                  <div className="event-card__main">
                    <div className="event-card__header">
                      <div>
                        <h3>{eventType.title}</h3>
                        <p>
                          {eventType.durationMinutes} min • {MEETING_MODE_LABELS[eventType.meetingMode]}
                        </p>
                      </div>
                    </div>

                    <div className="event-card__actions">
                      <button type="button" className="text-link" style={{ fontWeight: '600' }} onClick={() => handleCopyLink(eventType)}>
                        <Link2 size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
                        Copy link
                      </button>
                      {publicUrl ? (
                         <a href={publicUrl} target="_blank" rel="noreferrer" className="text-link">
                           View booking page
                         </a>
                      ) : (
                         <span className="text-muted text-sm">Set your username to generate links</span>
                      )}
                    </div>
                  </div>

                  <div className="event-card__side">
                    <div className="event-card__footer">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={eventType.isActive}
                          onChange={() => handleToggle(eventType)}
                        />
                        <span className="switch__track" />
                        <span className="sr-only">{eventType.isActive ? 'On' : 'Off'}</span>
                      </label>
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
                        <div className="dropdown-menu dropdown-menu--right">
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
