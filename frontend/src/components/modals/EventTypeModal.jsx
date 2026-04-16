import { useEffect, useState } from 'react';
import { slugifyValue } from '../../api.js';
import ModalFrame from '../ui/ModalFrame.jsx';

const MEETING_MODE_LABELS = {
  google_meet: 'Google Meet',
  zoom: 'Zoom',
  in_person: 'In person',
  phone: 'Phone call',
};

export default function EventTypeModal({ open, initialValue, submitting, onClose, onSubmit }) {
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
