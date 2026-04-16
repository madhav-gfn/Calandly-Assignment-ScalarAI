import brandMark from '../../assets/calendly_brand mark_color.svg';

export default function CenteredState({ title, description }) {
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
