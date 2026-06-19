export default function Navbar({ activeView, onNavigate, navItems = [], user, onLogout }) {
	return (
		<header className="topbar">
			<div>
				<div className="topbar-brand">AsterDocs</div>
				<p className="topbar-subtitle">Document management workspace</p>
			</div>

			<nav className="topbar-nav" aria-label="Primary">
				{navItems.map((item) => (
					<button
						key={item.id}
						type="button"
						className={activeView === item.id ? 'nav-pill active' : 'nav-pill'}
						onClick={() => onNavigate(item.id)}
					>
						{item.label}
					</button>
				))}
			</nav>

			<div className="topbar-meta">
				<span>{user?.role || 'Role'}</span>
				<strong>{user?.fullName || 'Guest'}</strong>
				{onLogout && (
					<button type="button" className="ghost-action topbar-logout" onClick={onLogout}>
						Logout
					</button>
				)}
			</div>
		</header>
	);
}
