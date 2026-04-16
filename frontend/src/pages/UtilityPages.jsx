import EmptyState from '../components/ui/EmptyState.jsx';
import CenteredState from '../components/ui/CenteredState.jsx';

export function PlaceholderPage({ title, description }) {
  return (
    <section className="panel">
      <EmptyState title={title} description={description} />
    </section>
  );
}

export function NotFoundPage() {
  return (
    <CenteredState
      title="This page does not exist"
      description="Use the admin shell or a valid booking link to continue."
    />
  );
}
