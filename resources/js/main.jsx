import 'bootstrap/dist/css/bootstrap.min.css'
import './styles.css'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Route, Routes, useMatch, useParams } from 'react-router-dom'
import { EventDetails, EventList, TicketLookup } from './attendee'
import { Attendees, CheckIn, EditEvent, StaffHome, StaffLogin } from './staff'
import { Accounts, Audit } from './staff-admin'
import { ActionDialog, Notice, Page, request } from './shared'
import { Icon } from './icons'

function EventPage({ component: Component }) {
  const { id } = useParams()
  return <Component key={id} />
}

function App({ brandMark }) {
  return <BrowserRouter><Layout brandMark={brandMark}/></BrowserRouter>
}

function StaffNavbar({ sidebarOpen, toggleSidebar }) {
  const { name, role } = document.getElementById('root').dataset
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      await request('/staff/logout', {})
      window.location.assign('/')
    } catch (failure) {
      setSignOutError(failure.message)
      setConfirmExit(false)
      setSigningOut(false)
    }
  }

  return <header className="staff-topbar">
    <button type="button" className="btn btn-outline-primary staff-sidebar-toggle" aria-label="Toggle staff sidebar"
      aria-expanded={sidebarOpen} aria-controls="staff-sidebar" onClick={toggleSidebar}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 6h18M3 12h18M3 18h18" />
      </svg>
    </button>
    <nav aria-label="Staff account">
      <button type="button" className="btn btn-outline-primary staff-menu-toggle" aria-label="Staff account menu"
        aria-expanded={menuOpen} aria-controls="staff-account-menu" onClick={() => setMenuOpen(!menuOpen)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="5" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <div id="staff-account-menu" className="staff-account-menu panel" hidden={!menuOpen}>
        <strong>{name}</strong>
        <p className="text-secondary mb-3">{role === 'organizer' ? 'Organizer' : 'Door staff'}</p>
        <button type="button" className="btn btn-outline-primary icon-link" disabled={signingOut} onClick={() => setConfirmExit(true)}>
          <Icon name="logout" />Sign out
        </button>
      </div>
    </nav>
    {confirmExit && <ActionDialog title="Sign out of EntryPass?" close={() => setConfirmExit(false)} confirm={signOut} label="Sign out" busy={signingOut}>You will need to sign in again to access staff pages.</ActionDialog>}
    {signOutError && <Notice>{signOutError}</Notice>}
  </header>
}
function StaffSidebar({ brandMark, open, close }) {
  const organizer = document.getElementById('root').dataset.role === 'organizer'
  return <aside id="staff-sidebar" className="staff-side" data-open={open}>
    <div className="staff-sidebar-heading">
      <Link className="brand" to="/staff" onClick={close}><img src={brandMark} alt="" width="32" height="32"/><span>EntryPass</span></Link>
      <button type="button" className="staff-sidebar-close" aria-label="Close staff sidebar" onClick={close}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
    <nav aria-label="Staff navigation">
      <NavLink end to="/staff" onClick={close}><Icon name={organizer ? 'dashboard' : 'ticket'}/><span>{organizer ? 'Dashboard' : 'Door check-in'}</span></NavLink>
      {organizer && <>
        <NavLink to="/staff/events/new" onClick={close}><Icon name="add"/><span>Create event</span></NavLink>
        <NavLink to="/staff/accounts" onClick={close}><Icon name="staff"/><span>Staff accounts</span></NavLink>
        <NavLink to="/staff/audit" onClick={close}><Icon name="audit"/><span>Audit log</span></NavLink>
      </>}
    </nav>
    <footer className="staff-footer"><span className="staff-footer-brand">@EntryPass </span>2026</footer>
  </aside>
}
function Layout({ brandMark }) {
  const staff = useMatch("/staff/*")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  if (useMatch("/entrypass-staff")) return <main className="login-layout"><StaffLogin/></main>
  return <div className={staff ? "staff-layout" : undefined}>
    {staff ? <><StaffSidebar brandMark={brandMark} open={sidebarOpen} close={() => setSidebarOpen(false)}/><StaffNavbar sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(open => !open)}/></> : <header className="site-header">
      <nav className="container d-flex flex-wrap align-items-center justify-content-between gap-2" aria-label="Main navigation">
        <Link className="brand" to="/"><img className="brand-icon" src={brandMark} width="32" height="32" alt="" /> EntryPass</Link>
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <Link className="icon-link" to="/"><Icon name="calendar" />Events</Link><Link className="icon-link" to="/tickets"><Icon name="ticket" />Find ticket</Link>
        </div>
      </nav>
    </header>}
    <main className="container py-4 py-md-5">
      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/events/:id" element={<EventPage component={EventDetails} />} />
        <Route path="/tickets" element={<TicketLookup />} />

        <Route path="/staff" element={<StaffHome />} />
        <Route path="/staff/events/new" element={<EditEvent />} />
        <Route path="/staff/events/:id/check-in" element={<EventPage component={CheckIn} />} />
        <Route path="/staff/events/:id/attendees" element={<EventPage component={Attendees} />} />
        <Route path="/staff/events/:id/edit" element={<EventPage component={EditEvent} />} />
        <Route path="/staff/accounts" element={<Accounts />} />
        <Route path="/staff/audit" element={<Audit />} />
        <Route path="*" element={<Page title="Page not found"><Link to="/">Browse events</Link></Page>} />
      </Routes>
    </main>
  </div>
}

const root = document.getElementById('root')
createRoot(root).render(<App brandMark={root.dataset.brandMark} />)
