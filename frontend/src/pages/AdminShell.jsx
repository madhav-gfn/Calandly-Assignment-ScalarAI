import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getCurrentUser, getApiErrorMessage } from '../api.js';
import { CORE_ROUTES, EXTRA_ROUTES } from '../constants.js';
import { getRouteTitle } from '../utils/helpers.js';
import horizontalLogo from '../assets/calendly_logo_horizontal_color.svg';
import brandMark from '../assets/calendly_brand mark_color.svg';
import SidebarIcon from '../components/ui/SidebarIcon.jsx';
import PageLoader from '../components/ui/PageLoader.jsx';
import CenteredState from '../components/ui/CenteredState.jsx';

export default function AdminShell() {
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
            {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <button
          type="button"
          className="outline-button sidebar__create"
          onClick={() => navigate('/app/scheduling?create=1')}
        >
          <span className="sidebar__create-plus"><Plus size={16} strokeWidth={3} /></span>
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
              <Plus size={16} strokeWidth={2.5} style={{ marginRight: '4px', display: 'inline' }} /> Create
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
