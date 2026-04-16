import { useEffect, useState } from 'react';
import ModalFrame from '../ui/ModalFrame.jsx';

export default function CancelMeetingModal({ open, onClose, onSubmit, submitting }) {
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
