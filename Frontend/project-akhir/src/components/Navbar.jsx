const navItems = [
	{ id: 'dashboard', label: 'Dashboard' },
	{ id: 'explorer', label: 'File Explorer' },
	{ id: 'approvals', label: 'Approvals' },
	{ id: 'users', label: 'User Management' },
	{ id: 'detail', label: 'Document Detail' },
];

export default function Navbar({ activeView, onNavigate }) {
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
				<span>Role</span>
				<strong>Document Admin</strong>
			</div>
		</header>
	);
}
