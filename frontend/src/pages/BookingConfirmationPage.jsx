import { useParams } from 'react-router-dom';
import { buildPublicBookingPath } from '../api.js';
import { formatDateInTimezone, readConfirmationRecord } from '../utils/helpers.js';
import horizontalLogo from '../assets/calendly_logo_horizontal_color.svg';
import CenteredState from '../components/ui/CenteredState.jsx';

export default function BookingConfirmationPage() {
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
