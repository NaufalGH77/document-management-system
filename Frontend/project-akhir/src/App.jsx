import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const BACKEND_ORIGIN = API_BASE.replace(/\/api$/, '');

const navViews = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'upload-document', label: 'Upload Document' },
  { id: 'edit-document', label: 'Edit Document' },
  { id: 'documents', label: 'Documents' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'users', label: 'Users' },
  { id: 'account', label: 'Account' },
];

const emptyAuthForm = {
  fullName: '',
  email: '',
  password: '',
  department: '',
};

const emptyUploadDocumentForm = {
  title: '',
  summary: '',
  status: 'draft',
  currentVersion: 'v1.0',
  changeNote: '',
  file: null,
};

const emptyEditDocumentForm = {
  title: '',
  summary: '',
  status: 'draft',
  changeNote: '',
  file: null,
};

const emptyAccountForm = {
  fullName: '',
  email: '',
  department: '',
  currentPassword: '',
  password: '',
};

const emptyUserForm = {
  fullName: '',
  email: '',
  role: 'user',
  department: '',
  password: '',
  status: 'active',
};

const emptyAdminUserEditForm = {
  fullName: '',
  email: '',
  role: 'user',
  department: '',
  status: 'active',
  password: '',
};

const emptyApprovalForm = {
  documentId: '',
  dueDate: '',
  notes: '',
};

function toFormData(values) {
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) {
      return;
    }

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

async function apiRequest(path, { token, method = 'GET', body, formData = false } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (!formData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (formData ? body : JSON.stringify(body)) : undefined,
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) {
    return '-';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function statusClass(status) {
  return String(status || 'pending').toLowerCase().replaceAll(' ', '-');
}

function resolveAssetUrl(assetPath) {
  if (!assetPath) {
    return '';
  }

  return new URL(assetPath, BACKEND_ORIGIN).toString();
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('dms_token') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [uploadDocumentForm, setUploadDocumentForm] = useState(emptyUploadDocumentForm);
  const [editDocumentForm, setEditDocumentForm] = useState(emptyEditDocumentForm);
  const [accountForm, setAccountForm] = useState(emptyAccountForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [approvalForm, setApprovalForm] = useState(emptyApprovalForm);
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  const [adminUserEditForm, setAdminUserEditForm] = useState(emptyAdminUserEditForm);

  const isAdmin = currentUser?.role === 'admin';
  const visibleNavItems = useMemo(
    () => navViews.filter((item) => item.id !== 'users' || isAdmin),
    [isAdmin]
  );

  const nonAdminUsers = useMemo(
    () => users.filter((user) => user.role !== 'admin'),
    [users]
  );

  const currentView = useMemo(() => {
    const safeActiveView = activeView === 'users' && !isAdmin ? 'dashboard' : activeView;
    const map = {
      dashboard: {
        title: 'Document control center',
        subtitle: 'Track files, approvals, accounts, and access from one workspace.',
      },
      documents: {
        title: 'Documents',
        subtitle: 'Upload, revise, and inspect document versions.',
      },
      'upload-document': {
        title: 'Upload document',
        subtitle: 'Create a new document without changing existing uploads.',
      },
      'edit-document': {
        title: 'Edit document',
        subtitle: 'Select an uploaded document and update only that record.',
      },
      approvals: {
        title: 'Approvals',
        subtitle: 'Review pending documents and record decisions.',
      },
      users: {
        title: 'User management',
        subtitle: 'Administer roles, status, and account access.',
      },
      account: {
        title: 'Account settings',
        subtitle: 'Edit your profile and password.',
      },
    };

    return map[safeActiveView] ?? map.dashboard;
  }, [activeView, isAdmin]);

  const loadWorkspace = async (authToken) => {
    setLoading(true);

    try {
      const [me, summaryData, docs, approvalData] = await Promise.all([
        apiRequest('/users/me', { token: authToken }),
        apiRequest('/dashboard/summary', { token: authToken }),
        apiRequest('/documents', { token: authToken }),
        apiRequest('/approvals', { token: authToken }),
      ]);

      setCurrentUser(me);
      setSummary(summaryData);
      setDocuments(docs || []);
      setApprovals(approvalData || []);
      setActiveView((previous) => (previous === 'login' ? 'dashboard' : previous));

      if (me?.role === 'admin') {
        const adminUsers = await apiRequest('/users', { token: authToken });
        setUsers(adminUsers || []);
        setSelectedAdminUser((adminUsers || []).find((user) => user.role !== 'admin') || null);
        setAdminUserEditForm(
          (adminUsers || []).find((user) => user.role !== 'admin')
            ? toAdminEditForm((adminUsers || []).find((user) => user.role !== 'admin'))
            : emptyAdminUserEditForm
        );
      } else {
        setUsers([]);
        setSelectedAdminUser(null);
        setAdminUserEditForm(emptyAdminUserEditForm);
      }

      setSelectedDocument(null);
      setEditDocumentForm(emptyEditDocumentForm);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
      handleLogout(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadWorkspace(token);
    }
  }, []);

  const handleLogout = async (performRemoteLogout = true) => {
    try {
      if (performRemoteLogout && token) {
        await apiRequest('/auth/logout', { method: 'POST', token });
      }
    } catch {
      // ignore logout errors and clear local state anyway
    } finally {
      localStorage.removeItem('dms_token');
      setToken('');
      setCurrentUser(null);
      setSummary(null);
      setDocuments([]);
      setApprovals([]);
      setUsers([]);
      setSelectedDocument(null);
      setUploadDocumentForm(emptyUploadDocumentForm);
      setEditDocumentForm(emptyEditDocumentForm);
      setSelectedAdminUser(null);
      setAdminUserEditForm(emptyAdminUserEditForm);
      setActiveView('dashboard');
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = {
        fullName: authForm.fullName,
        email: authForm.email,
        password: authForm.password,
        department: authForm.department,
      };

      const result = await apiRequest(endpoint, { method: 'POST', body: payload });
      localStorage.setItem('dms_token', result.token);
      setToken(result.token);
      setCurrentUser(result.user);
      setMessage({ type: 'success', text: authMode === 'login' ? 'Login berhasil.' : 'Akun berhasil dibuat.' });
      setAuthForm(emptyAuthForm);
      await loadWorkspace(result.token);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const refreshDocuments = async () => {
    const docs = await apiRequest('/documents', { token });
    setDocuments(docs || []);
  };

  const refreshApprovals = async () => {
    const data = await apiRequest('/approvals', { token });
    setApprovals(data || []);
  };

  const refreshUsers = async () => {
    if (isAdmin) {
      const data = await apiRequest('/users', { token });
      setUsers(data || []);

      const nextSelected = (data || []).find((user) => user.id === selectedAdminUser?.id) || (data || []).find((user) => user.role !== 'admin') || null;
      setSelectedAdminUser(nextSelected);
      setAdminUserEditForm(nextSelected ? toAdminEditForm(nextSelected) : emptyAdminUserEditForm);
    }
  };

  const toEditDocumentForm = (document) => ({
    title: document.title || '',
    summary: document.summary || '',
    status: document.status || 'draft',
    changeNote: '',
    file: null,
  });

  const toAdminEditForm = (user) => ({
    fullName: user.fullName || '',
    email: user.email || '',
    role: user.role || 'user',
    department: user.department || '',
    status: user.status || 'active',
    password: '',
  });

  const handleViewDocument = async (documentId) => {
    try {
      const document = await apiRequest(`/documents/${documentId}`, { token });
      setSelectedDocument(document);
      setActiveView('documents');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSelectDocumentForEdit = async (documentId) => {
    try {
      const document = await apiRequest(`/documents/${documentId}`, { token });
      setSelectedDocument(document);
      setEditDocumentForm(toEditDocumentForm(document));
      setActiveView('edit-document');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleOpenDocument = (assetPath) => {
    const url = resolveAssetUrl(assetPath);

    if (!url) {
      setMessage({ type: 'error', text: 'File belum tersedia untuk dibuka.' });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadDocument = (assetPath, fileName = 'document') => {
    const url = resolveAssetUrl(assetPath);

    if (!url) {
      setMessage({ type: 'error', text: 'File belum tersedia untuk diunduh.' });
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleUploadDocumentSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = toFormData(uploadDocumentForm);

      await apiRequest('/documents', { method: 'POST', token, body: payload, formData: true });
      setMessage({ type: 'success', text: 'Dokumen berhasil diunggah.' });
      setUploadDocumentForm(emptyUploadDocumentForm);
      await refreshDocuments();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocumentSubmit = async (event) => {
    event.preventDefault();

    if (!selectedDocument?.id) {
      setMessage({ type: 'error', text: 'Pilih document yang ingin diedit terlebih dahulu.' });
      return;
    }

    setLoading(true);

    try {
      const payload = toFormData(editDocumentForm);

      await apiRequest(`/documents/${selectedDocument.id}`, {
        method: 'PATCH',
        token,
        body: payload,
        formData: true,
      });

      setMessage({ type: 'success', text: 'Dokumen berhasil diperbarui.' });
      await refreshDocuments();

      const refreshed = await apiRequest(`/documents/${selectedDocument.id}`, { token });
      setSelectedDocument(refreshed);
      setEditDocumentForm(toEditDocumentForm(refreshed));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (approvalId, status) => {
    try {
      await apiRequest(`/approvals/${approvalId}`, {
        method: 'PATCH',
        token,
        body: { status, notes: status === 'approved' ? 'Approved from dashboard' : 'Rejected from dashboard' },
      });

      setMessage({ type: 'success', text: `Approval ${status} saved.` });
      await Promise.all([refreshApprovals(), refreshDocuments()]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleCreateApproval = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/approvals', {
        method: 'POST',
        token,
        body: {
          documentId: Number.parseInt(approvalForm.documentId || selectedDocument?.id || 0, 10),
          dueDate: approvalForm.dueDate || undefined,
          notes: approvalForm.notes || undefined,
          status: 'pending',
        },
      });

      setMessage({ type: 'success', text: 'Approval request created.' });
      setApprovalForm(emptyApprovalForm);
      await refreshApprovals();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        fullName: accountForm.fullName,
        email: accountForm.email,
        department: accountForm.department,
        currentPassword: accountForm.currentPassword,
        password: accountForm.password,
      };

      const updated = await apiRequest('/users/me', {
        method: 'PATCH',
        token,
        body: payload,
      });

      setCurrentUser(updated);
      setMessage({ type: 'success', text: 'Account updated.' });
      setAccountForm((previous) => ({
        ...previous,
        currentPassword: '',
        password: '',
      }));
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/users', {
        method: 'POST',
        token,
        body: userForm,
      });

      setMessage({ type: 'success', text: 'User created.' });
      setUserForm(emptyUserForm);
      await refreshUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, patch) => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'PATCH',
        token,
        body: patch,
      });

      setMessage({ type: 'success', text: 'User updated.' });
      await refreshUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await apiRequest(`/users/${userId}`, {
        method: 'DELETE',
        token,
      });

      setMessage({ type: 'success', text: 'User deactivated.' });
      await refreshUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handleSelectAdminUser = (user) => {
    setSelectedAdminUser(user);
    setAdminUserEditForm(toAdminEditForm(user));
  };

  const handleAdminUserEditSubmit = async (event) => {
    event.preventDefault();

    if (!selectedAdminUser) {
      setMessage({ type: 'error', text: 'Pilih akun terlebih dahulu.' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: adminUserEditForm.fullName,
        email: adminUserEditForm.email,
        role: adminUserEditForm.role,
        department: adminUserEditForm.department,
        status: adminUserEditForm.status,
      };

      if (adminUserEditForm.password) {
        payload.password = adminUserEditForm.password;
      }

      const updated = await apiRequest(`/users/${selectedAdminUser.id}`, {
        method: 'PATCH',
        token,
        body: payload,
      });

      setMessage({ type: 'success', text: 'Akun berhasil diperbarui.' });
      setSelectedAdminUser(updated);
      setAdminUserEditForm(toAdminEditForm(updated));
      await refreshUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const dashboardHighlights = [
    { label: 'Documents', value: summary?.activeDocuments ?? documents.length, delta: 'Synced from backend' },
    { label: 'Pending approvals', value: summary?.pendingApprovals ?? approvals.filter((item) => item.status === 'pending').length, delta: 'Need review' },
    { label: 'Active users', value: summary?.activeUsers ?? users.filter((item) => item.status === 'active').length, delta: 'Workspace members' },
    { label: 'Folders', value: summary?.folders ?? '-', delta: 'Library structure' },
  ];

  if (!token) {
    return (
      <div className="app-shell auth-shell">
        <main className="app-main auth-main">
          <section className="auth-panel panel">
            <div className="section-heading">
              <h2>{authMode === 'login' ? 'Sign in' : 'Create account'}</h2>
              <span>Document Management System</span>
            </div>

            <form className="form-grid" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <label className="field">
                  <span>Full name</span>
                  <input value={authForm.fullName} onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })} />
                </label>
              )}
              <label className="field">
                <span>Email</span>
                <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
              </label>
              <label className="field">
                <span>Password</span>
                <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
              </label>
              {authMode === 'register' && (
                <label className="field">
                  <span>Department</span>
                  <input value={authForm.department} onChange={(event) => setAuthForm({ ...authForm, department: event.target.value })} />
                </label>
              )}
              <button type="submit" className="primary-action" disabled={loading}>
                {authMode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>

            <button type="button" className="ghost-action" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
              {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
            </button>

            {message && <p className={`form-message ${message.type}`}>{message.text}</p>}
          </section>
        </main>
      </div>
    );
  }

  const renderContent = () => {
    const safeActiveView = activeView === 'users' && !isAdmin ? 'dashboard' : activeView;

    switch (safeActiveView) {
      case 'upload-document':
        return (
          <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Upload document</h2>
                <span>Creates a new record</span>
              </div>

              <form className="form-grid" onSubmit={handleUploadDocumentSubmit}>
                <label className="field">
                  <span>Title</span>
                  <input
                    value={uploadDocumentForm.title}
                    onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, title: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Summary</span>
                  <textarea
                    rows="4"
                    value={uploadDocumentForm.summary}
                    onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, summary: event.target.value })}
                  />
                </label>
                <div className="form-note">Documents are uploaded as unfiled by default. Folder assignment can be added later.</div>
                <div className="split-fields">
                  <label className="field">
                    <span>Status</span>
                    <select
                      value={uploadDocumentForm.status}
                      onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, status: event.target.value })}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Version</span>
                    <input
                      value={uploadDocumentForm.currentVersion}
                      onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, currentVersion: event.target.value })}
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Change note</span>
                  <input
                    value={uploadDocumentForm.changeNote}
                    onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, changeNote: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>File</span>
                  <input
                    type="file"
                    onChange={(event) => setUploadDocumentForm({ ...uploadDocumentForm, file: event.target.files?.[0] || null })}
                  />
                </label>
                <button type="submit" className="primary-action" disabled={loading}>Upload document</button>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <h2>Recent documents</h2>
                <span>{documents.length} items</span>
              </div>
              <div className="document-list compact">
                {documents.slice(0, 6).map((document) => (
                  <button key={document.id} type="button" className="document-row compact-row document-button" onClick={() => handleViewDocument(document.id)}>
                    <div>
                      <div className="document-title-row">
                        <h3>{document.title}</h3>
                        <span className={`status-pill ${statusClass(document.status)}`}>{document.status}</span>
                      </div>
                      <p>{document.folder || 'Unfiled'}</p>
                    </div>
                    <span>{document.updatedAt || '-'}</span>
                  </button>
                ))}
              </div>
            </article>
          </section>
        );
      case 'edit-document':
        return (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Edit document</h2>
                <span>{selectedDocument ? `Current: ${selectedDocument.title}` : 'Choose a document first'}</span>
              </div>

              <div className="document-list compact edit-picker-list">
                {documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    className={selectedDocument?.id === document.id ? 'document-row compact-row document-button active-doc' : 'document-row compact-row document-button'}
                    onClick={() => handleSelectDocumentForEdit(document.id)}
                  >
                    <div>
                      <div className="document-title-row">
                        <h3>{document.title}</h3>
                        <span className={`status-pill ${statusClass(document.status)}`}>{document.status}</span>
                      </div>
                      <p>{document.folder || 'Unfiled'}</p>
                    </div>
                    <span>{document.version}</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <h2>Update selected document</h2>
                <span>{selectedDocument ? selectedDocument.fileType : 'No selection'}</span>
              </div>

              {!selectedDocument ? (
                <div className="empty-state">
                  <p>Select a document from the list to start editing.</p>
                </div>
              ) : (
                <form className="form-grid" onSubmit={handleEditDocumentSubmit}>
                  <label className="field">
                    <span>Title</span>
                    <input
                      value={editDocumentForm.title}
                      onChange={(event) => setEditDocumentForm({ ...editDocumentForm, title: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      rows="4"
                      value={editDocumentForm.summary}
                      onChange={(event) => setEditDocumentForm({ ...editDocumentForm, summary: event.target.value })}
                    />
                  </label>
                  <div className="split-fields">
                    <label className="field">
                      <span>Status</span>
                      <select
                        value={editDocumentForm.status}
                        onChange={(event) => setEditDocumentForm({ ...editDocumentForm, status: event.target.value })}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Current version</span>
                      <input value={selectedDocument.version} disabled />
                    </label>
                  </div>
                  <label className="field">
                    <span>Change note</span>
                    <input
                      value={editDocumentForm.changeNote}
                      onChange={(event) => setEditDocumentForm({ ...editDocumentForm, changeNote: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Replace file</span>
                    <input
                      type="file"
                      onChange={(event) => setEditDocumentForm({ ...editDocumentForm, file: event.target.files?.[0] || null })}
                    />
                  </label>
                  <button type="submit" className="primary-action" disabled={loading}>Save document</button>
                </form>
              )}
            </article>
          </section>
        );
      case 'documents':
        return (
          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Documents overview</h2>
                <span>{documents.length} items</span>
              </div>

              <div className="document-list">
                {documents.map((document) => (
                  <button key={document.id} type="button" className="document-row document-button" onClick={() => handleViewDocument(document.id)}>
                    <div>
                      <div className="document-title-row">
                        <h3>{document.title}</h3>
                        <span className={`status-pill ${statusClass(document.status)}`}>{document.status}</span>
                      </div>
                      <p>{document.folder || 'Unfiled'}</p>
                    </div>
                    <div className="row-meta">
                      <span>Owner: {document.owner}</span>
                      <span>Version: {document.version}</span>
                      <span>File: {document.fileType}</span>
                    </div>
                  </button>
                ))}
              </div>

              {selectedDocument && (
                <div className="detail-card">
                  <div className="section-heading">
                    <h2>Selected document</h2>
                    <span>{selectedDocument.fileType}</span>
                  </div>
                  <p>{selectedDocument.summary}</p>
                  <div className="detail-grid">
                    <div>
                      <span>Owner</span>
                      <strong>{selectedDocument.owner}</strong>
                    </div>
                    <div>
                      <span>Version</span>
                      <strong>{selectedDocument.version}</strong>
                    </div>
                    <div>
                      <span>Size</span>
                      <strong>{formatSize(selectedDocument.fileSizeBytes)}</strong>
                    </div>
                  </div>
                  <div className="action-group detail-actions">
                    <button type="button" className="primary-action" onClick={() => handleOpenDocument(selectedDocument.fileUrl)}>
                      Open document
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadDocument(selectedDocument.fileUrl, selectedDocument.originalFileName || selectedDocument.fileName)}
                    >
                      Download document
                    </button>
                    <button type="button" onClick={() => handleSelectDocumentForEdit(selectedDocument.id)}>
                      Edit document
                    </button>
                  </div>
                  <p className="small-print">File: {selectedDocument.fileName}</p>
                  {selectedDocument.versions?.length > 0 && (
                    <div className="timeline">
                      {selectedDocument.versions.map((version) => (
                        <div key={version.id} className="timeline-item">
                          <span className="timeline-dot" />
                          <p>{version.versionLabel} - {version.changeNote || 'Version saved'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          </section>
        );
      case 'approvals':
        return (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Create approval</h2>
                <span>Request a review</span>
              </div>

              <form className="form-grid" onSubmit={handleCreateApproval}>
                <label className="field">
                  <span>Document ID</span>
                  <input
                    value={approvalForm.documentId}
                    onChange={(event) => setApprovalForm({ ...approvalForm, documentId: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Due date</span>
                  <input
                    type="date"
                    value={approvalForm.dueDate}
                    onChange={(event) => setApprovalForm({ ...approvalForm, dueDate: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Notes</span>
                  <textarea
                    rows="4"
                    value={approvalForm.notes}
                    onChange={(event) => setApprovalForm({ ...approvalForm, notes: event.target.value })}
                  />
                </label>
                <button type="submit" className="primary-action" disabled={loading}>Create approval</button>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <h2>Approval queue</h2>
                <span>{approvals.length} records</span>
              </div>

              <div className="approval-grid">
                {approvals.map((approval) => (
                  <article key={approval.id} className="approval-card">
                    <div>
                      <strong>{approval.document_title}</strong>
                      <p>Requested by: {approval.requested_by}</p>
                    </div>
                    <div className="approval-meta">
                      <span>Reviewer: {approval.reviewer_name}</span>
                      <span>Due: {approval.due_date || 'No date set'}</span>
                    </div>
                    <div className="approval-footer">
                      <span className={`status-pill ${statusClass(approval.status)}`}>{approval.status}</span>
                      <div className="action-group">
                        <button type="button" onClick={() => handleApprovalAction(approval.id, 'rejected')}>Reject</button>
                        <button type="button" className="primary-action" onClick={() => handleApprovalAction(approval.id, 'approved')}>Approve</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        );
      case 'users':
        if (!isAdmin) {
          return null;
        }

        return (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Create user</h2>
                <span>Admin only</span>
              </div>

              <form className="form-grid" onSubmit={handleCreateUser}>
                <label className="field">
                  <span>Full name</span>
                  <input value={userForm.fullName} onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
                </label>
                <div className="split-fields">
                  <label className="field">
                    <span>Role</span>
                    <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                      <option value="user">User</option>
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Status</span>
                    <select value={userForm.status} onChange={(event) => setUserForm({ ...userForm, status: event.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span>Department</span>
                  <input value={userForm.department} onChange={(event) => setUserForm({ ...userForm, department: event.target.value })} />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
                </label>
                <button type="submit" className="primary-action" disabled={loading}>Create user</button>
              </form>
            </article>

            <article className="panel">
              <div className="section-heading">
                <h2>User accounts</h2>
                <span>{nonAdminUsers.length} non-admin accounts</span>
              </div>

              <div className="document-list compact admin-account-list">
                {nonAdminUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={selectedAdminUser?.id === user.id ? 'document-row compact-row document-button active-doc' : 'document-row compact-row document-button'}
                    onClick={() => handleSelectAdminUser(user)}
                  >
                    <div>
                      <div className="document-title-row">
                        <h3>{user.fullName}</h3>
                        <span className={`status-pill ${statusClass(user.status)}`}>{user.status}</span>
                      </div>
                      <p>{user.email}</p>
                    </div>
                    <span>{user.role}</span>
                  </button>
                ))}
              </div>

              <div className="detail-card admin-detail-card">
                <div className="section-heading">
                  <h2>Account detail</h2>
                  <span>{selectedAdminUser ? selectedAdminUser.role : 'Select an account'}</span>
                </div>

                {!selectedAdminUser ? (
                  <div className="empty-state">
                    <p>Select a non-admin account to view details and edit it.</p>
                  </div>
                ) : (
                  <>
                    <div className="detail-grid admin-detail-grid">
                      <div>
                        <span>Full name</span>
                        <strong>{selectedAdminUser.fullName}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong className="profile-email">{selectedAdminUser.email}</strong>
                      </div>
                      <div>
                        <span>Role</span>
                        <strong>{selectedAdminUser.role}</strong>
                      </div>
                      <div>
                        <span>Department</span>
                        <strong>{selectedAdminUser.department || '-'}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{selectedAdminUser.status}</strong>
                      </div>
                      <div>
                        <span>Last login</span>
                        <strong>{selectedAdminUser.lastLoginAt || '-'}</strong>
                      </div>
                      <div>
                        <span>Created at</span>
                        <strong>{selectedAdminUser.createdAt || '-'}</strong>
                      </div>
                      <div>
                        <span>Updated at</span>
                        <strong>{selectedAdminUser.updatedAt || '-'}</strong>
                      </div>
                    </div>

                    <form className="form-grid admin-edit-form" onSubmit={handleAdminUserEditSubmit}>
                      <label className="field">
                        <span>Full name</span>
                        <input value={adminUserEditForm.fullName} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, fullName: event.target.value })} />
                      </label>
                      <label className="field">
                        <span>Email</span>
                        <input type="email" value={adminUserEditForm.email} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, email: event.target.value })} />
                      </label>
                      <div className="split-fields">
                        <label className="field">
                          <span>Role</span>
                          <select value={adminUserEditForm.role} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, role: event.target.value })}>
                            <option value="user">User</option>
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="reviewer">Reviewer</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Status</span>
                          <select value={adminUserEditForm.status} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, status: event.target.value })}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        </label>
                      </div>
                      <label className="field">
                        <span>Department</span>
                        <input value={adminUserEditForm.department} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, department: event.target.value })} />
                      </label>
                      <label className="field">
                        <span>New password</span>
                        <input type="password" value={adminUserEditForm.password} onChange={(event) => setAdminUserEditForm({ ...adminUserEditForm, password: event.target.value })} />
                      </label>
                      <div className="action-group">
                        <button type="submit" className="primary-action" disabled={loading}>Save account</button>
                        <button type="button" onClick={() => handleDeleteUser(selectedAdminUser.id)}>Deactivate</button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </article>
          </section>
        );
      case 'account':
        return (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="panel">
              <div className="section-heading">
                <h2>Profile</h2>
                <span>{currentUser?.role}</span>
              </div>
              <div className="detail-grid profile-grid">
                <div>
                  <span>Name</span>
                  <strong>{currentUser?.fullName}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong className="profile-email">{currentUser?.email}</strong>
                </div>
                <div>
                  <span>Department</span>
                  <strong>{currentUser?.department || '-'}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{currentUser?.status}</strong>
                </div>
              </div>
            </article>

            <article className="panel">
              <div className="section-heading">
                <h2>Edit account</h2>
                <span>Update your details</span>
              </div>

              <form className="form-grid" onSubmit={handleAccountSubmit}>
                <label className="field">
                  <span>Full name</span>
                  <input value={accountForm.fullName} onChange={(event) => setAccountForm({ ...accountForm, fullName: event.target.value })} />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} />
                </label>
                <label className="field">
                  <span>Department</span>
                  <input value={accountForm.department} onChange={(event) => setAccountForm({ ...accountForm, department: event.target.value })} />
                </label>
                <div className="split-fields">
                  <label className="field">
                    <span>Current password</span>
                    <input type="password" value={accountForm.currentPassword} onChange={(event) => setAccountForm({ ...accountForm, currentPassword: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>New password</span>
                    <input type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} />
                  </label>
                </div>
                <button type="submit" className="primary-action" disabled={loading}>Save account</button>
              </form>
            </article>
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
                {currentUser?.fullName}, the workspace is connected to the backend and ready for live document and user operations.
              </p>
              <div className="hero-actions">
                <button type="button" className="primary-action" onClick={() => setActiveView('upload-document')}>Upload document</button>
                <button type="button" onClick={() => setActiveView('approvals')}>Review approvals</button>
              </div>
            </div>

            <div className="stats-grid">
              {dashboardHighlights.map((stat) => (
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
                  <span>Backend feed</span>
                </div>
                <div className="document-list compact">
                  {documents.slice(0, 4).map((document) => (
                    <button key={document.id} type="button" className="document-row compact-row document-button" onClick={() => handleViewDocument(document.id)}>
                      <div>
                        <div className="document-title-row">
                          <h3>{document.title}</h3>
                          <span className={`status-pill ${statusClass(document.status)}`}>{document.status}</span>
                        </div>
                        <p>{document.folder || 'Unfiled'}</p>
                      </div>
                      <span>{document.updatedAt || '-'}</span>
                    </button>
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
                    <strong>{approvals.filter((item) => item.status === 'pending').length} approvals</strong>
                    <p>Need reviewer action before publishing.</p>
                  </div>
                  <div>
                    <strong>{documents.filter((item) => item.status === 'draft').length} drafts</strong>
                    <p>Ready to upload or revise.</p>
                  </div>
                  <div>
                    <strong>{isAdmin ? users.length : 1} accounts</strong>
                    <p>{isAdmin ? 'Admin can manage accounts directly.' : 'Edit your own profile from Account.'}</p>
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
      <Navbar
        activeView={activeView}
        onNavigate={setActiveView}
        navItems={visibleNavItems}
        user={currentUser}
        onLogout={handleLogout}
      />

      <main className="app-main">
        <section className="page-hero">
          <div>
            <span className="eyebrow">Document Management System</span>
            <h1>{currentView.title}</h1>
            <p>{currentView.subtitle}</p>
          </div>
          <div className="hero-badge">
            <span>Session</span>
            <strong>{currentUser?.fullName}</strong>
          </div>
        </section>

        {message && <div className={`message-banner ${message.type}`}>{message.text}</div>}
        {renderContent()}
      </main>
    </div>
  );
}

export default App;