import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelMeeting, getApiErrorMessage, getMeeting, listMeetings, rescheduleMeeting } from '../api.js';
import { MEETING_MODE_LABELS } from '../constants.js';
import { formatDateInTimezone } from '../utils/helpers.js';
import SidebarIcon from '../components/ui/SidebarIcon.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import CancelMeetingModal from '../components/modals/CancelMeetingModal.jsx';
import RescheduleModal from '../components/modals/RescheduleModal.jsx';

export default function MeetingsPage() {
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
