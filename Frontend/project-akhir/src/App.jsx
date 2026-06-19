import { useMemo, useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';

const dashboardStats = [
  { label: 'Active documents', value: '1,284', delta: '+18 this week' },
  { label: 'Pending approvals', value: '42', delta: '9 need review today' },
  { label: 'Active users', value: '86', delta: '12 departments connected' },
  { label: 'Versioned files', value: '317', delta: '94% tracked automatically' },
];

const documentItems = [
  {
    id: 1,
    name: 'Q3 Procurement Policy',
    folder: 'Policies / Procurement',
    owner: 'Nadia A.',
    status: 'Approved',
    updated: '2 hours ago',
    tag: 'Policy',
  },
  {
    id: 2,
    name: 'Vendor NDA v4',
    folder: 'Legal / Contracts',
    owner: 'Rafi M.',
    status: 'In Review',
    updated: 'Today, 09:30',
    tag: 'Contract',
  },
  {
    id: 3,
    name: 'Quarterly Budget Template',
    folder: 'Finance / Planning',
    owner: 'Mira S.',
    status: 'Needs Changes',
    updated: 'Yesterday',
    tag: 'Template',
  },
  {
    id: 4,
    name: 'Employee Onboarding Pack',
    folder: 'HR / Onboarding',
    owner: 'Ardi P.',
    status: 'Approved',
    updated: '3 days ago',
    tag: 'Guide',
  },
];

const approvalItems = [
  {
    title: 'Vendor NDA v4',
    requester: 'Legal Team',
    due: 'Due in 4 hours',
    reviewer: 'Head of Legal',
    status: 'Waiting approval',
  },
  {
    title: 'Travel Policy Revision',
    requester: 'HR Team',
    due: 'Due tomorrow',
    reviewer: 'Operations Lead',
    status: 'Needs comment',
  },
  {
    title: 'Finance SOP Addendum',
    requester: 'Finance Team',
    due: 'Queued',
    reviewer: 'CFO Office',
    status: 'Ready for review',
  },
];

const teamMembers = [
  { name: 'Nadia A.', role: 'Document Owner', department: 'Procurement', access: 'Full access' },
  { name: 'Rafi M.', role: 'Reviewer', department: 'Legal', access: 'Review only' },
  { name: 'Mira S.', role: 'Editor', department: 'Finance', access: 'Edit and upload' },
  { name: 'Ardi P.', role: 'Viewer', department: 'HR', access: 'Read only' },
];

const folderTree = [
  { name: 'Policies', count: 128 },
  { name: 'Contracts', count: 64 },
  { name: 'Templates', count: 91 },
  { name: 'Archives', count: 301 },
];

const selectedDocument = {
  title: 'Q3 Procurement Policy',
  version: 'v1.8',
  owner: 'Nadia A.',
  department: 'Procurement',
  lastUpdate: '2 hours ago',
  fileType: 'PDF',
  size: '4.2 MB',
  status: 'Approved',
  summary:
    'This document defines purchasing limits, vendor onboarding rules, and approval thresholds for cross-department procurement.',
  history: [
    'v1.8 - Approved by Head of Operations',
    'v1.7 - Added supplier risk checklist',
    'v1.6 - Updated signature workflow',
  ],
};

const viewConfig = {
  dashboard: {
    title: 'Document control center',
    subtitle: 'Track files, owners, approvals, and access from one unified workspace.',
  },
  explorer: {
    title: 'File explorer',
    subtitle: 'Browse folders, monitor file health, and jump into documents instantly.',
  },
  approvals: {
    title: 'Approval queue',
    subtitle: 'Manage document reviews with clear ownership and due dates.',
  },
  users: {
    title: 'User management',
    subtitle: 'Control roles, permissions, and departmental access.',
  },
  detail: {
    title: 'Document detail',
    subtitle: 'Inspect metadata, versions, and review history before publishing.',
  },
};

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const currentView = useMemo(() => viewConfig[activeView] ?? viewConfig.dashboard, [activeView]);

  const renderView = () => {
    switch (activeView) {
      case 'explorer':
        return (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="panel">
              <div className="section-heading">
                <h2>Folders</h2>
                <span>24 active libraries</span>
              </div>
              <div className="folder-list">
                {folderTree.map((folder) => (
                  <button key={folder.name} className="folder-card" type="button">
                    <strong>{folder.name}</strong>
                    <span>{folder.count} items</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="section-heading">
                <h2>Documents</h2>
                <span>Sorted by recency</span>
              </div>
              <div className="document-list">
                {documentItems.map((document) => (
                  <article key={document.id} className="document-row">
                    <div>
                      <div className="document-title-row">
                        <h3>{document.name}</h3>
                        <span className={`status-pill ${document.status.toLowerCase().replaceAll(' ', '-')}`}>
                          {document.status}
                        </span>
                      </div>
                      <p>{document.folder}</p>
                    </div>
                    <div className="row-meta">
                      <span>Owner: {document.owner}</span>
                      <span>Updated: {document.updated}</span>
                      <span>Type: {document.tag}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      case 'approvals':
        return (
          <section className="panel">
            <div className="section-heading">
              <h2>Approval tasks</h2>
              <span>3 items awaiting action</span>
            </div>
            <div className="approval-grid">
              {approvalItems.map((item) => (
                <article key={item.title} className="approval-card">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.requester}</p>
                  </div>
                  <div className="approval-meta">
                    <span>{item.due}</span>
                    <span>Reviewer: {item.reviewer}</span>
                  </div>
                  <div className="approval-footer">
                    <span className="status-pill pending">{item.status}</span>
                    <div className="action-group">
                      <button type="button">Request changes</button>
                      <button type="button" className="primary-action">Approve</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      case 'users':
        return (
          <section className="panel">
            <div className="section-heading">
              <h2>Access matrix</h2>
              <span>Role-based permissions</span>
            </div>
            <div className="user-table">
              <div className="user-table-head">
                <span>User</span>
                <span>Role</span>
                <span>Department</span>
                <span>Access</span>
              </div>
              {teamMembers.map((member) => (
                <div key={member.name} className="user-table-row">
                  <span>{member.name}</span>
                  <span>{member.role}</span>
                  <span>{member.department}</span>
                  <span>{member.access}</span>
                </div>
              ))}
            </div>
          </section>
        );
      case 'detail':
        return (
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="panel">
              <div className="document-detail-header">
                <div>
                  <span className="eyebrow">{selectedDocument.fileType}</span>
                  <h2>{selectedDocument.title}</h2>
                </div>
                <span className="status-pill approved">{selectedDocument.status}</span>
              </div>
              <p className="detail-summary">{selectedDocument.summary}</p>
              <div className="detail-grid">
                <div>
                  <span>Owner</span>
                  <strong>{selectedDocument.owner}</strong>
                </div>
                <div>
                  <span>Department</span>
                  <strong>{selectedDocument.department}</strong>
                </div>
                <div>
                  <span>Version</span>
                  <strong>{selectedDocument.version}</strong>
                </div>
                <div>
                  <span>Last update</span>
                  <strong>{selectedDocument.lastUpdate}</strong>
                </div>
                <div>
                  <span>File size</span>
                  <strong>{selectedDocument.size}</strong>
                </div>
                <div>
                  <span>Primary action</span>
                  <strong>Sign-off ready</strong>
                </div>
              </div>
            </article>

            <aside className="panel">
              <div className="section-heading">
                <h2>Version trail</h2>
                <span>Audit history</span>
              </div>
              <div className="timeline">
                {selectedDocument.history.map((entry) => (
                  <div key={entry} className="timeline-item">
                    <span className="timeline-dot" />
                    <p>{entry}</p>
                  </div>
                ))}
              </div>
            </aside>
          </section>
        );
      case 'dashboard':
      default:
        return (
          <section className="dashboard-grid">
            <div className="hero-card panel">
              <div className="eyebrow">Workspace overview</div>
              <h2>Centralize documents, approvals, and access in one place.</h2>
              <p>
                This version positions the app as a document management system, so the product story is
                stronger than a basic task board.
              </p>
              <div className="hero-actions">
                <button type="button" className="primary-action">
                  Upload document
                </button>
                <button type="button">Review approvals</button>
              </div>
            </div>

            <div className="stats-grid">
              {dashboardStats.map((stat) => (
                <article key={stat.label} className="panel stat-card">
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.delta}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
              <section className="panel">
                <div className="section-heading">
                  <h2>Recent documents</h2>
                  <span>Fresh activity</span>
                </div>
                <div className="document-list compact">
                  {documentItems.map((document) => (
                    <article key={document.id} className="document-row compact-row">
                      <div>
                        <div className="document-title-row">
                          <h3>{document.name}</h3>
                          <span className={`status-pill ${document.status.toLowerCase().replaceAll(' ', '-')}`}>
                            {document.status}
                          </span>
                        </div>
                        <p>{document.folder}</p>
                      </div>
                      <span>{document.updated}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-heading">
                  <h2>Operational focus</h2>
                  <span>Today</span>
                </div>
                <div className="focus-stack">
                  <div>
                    <strong>5 documents</strong>
                    <p>Need policy owners to confirm final wording.</p>
                  </div>
                  <div>
                    <strong>2 approvals</strong>
                    <p>Waiting on executive sign-off before publishing.</p>
                  </div>
                  <div>
                    <strong>14 users</strong>
                    <p>Received new folder permissions this week.</p>
                  </div>
                </div>
              </section>
            </div>
          </section>
        );
    }
  };

  return (
    <div className="app-shell">
      <Navbar activeView={activeView} onNavigate={setActiveView} />

      <main className="app-main">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Document Management System</span>
            <h1>{currentView.title}</h1>
            <p>{currentView.subtitle}</p>
          </div>
          <div className="hero-badge">
            <span>Compliance ready</span>
            <strong>Audit trail enabled</strong>
          </div>
        </section>

        {renderView()}
      </main>
    </div>
  );
}

export default App;