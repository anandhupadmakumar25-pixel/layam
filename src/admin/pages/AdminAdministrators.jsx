import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth.jsx'
import {
  fetchAdministrators,
  createAdministrator,
  updateAdministrator,
  activateAdministrator,
  deactivateAdministrator,
  resetAdministratorPassword,
  fetchAdministratorAuditLogs,
} from '../../services/api.js'
import './AdminAdministrators.css'

const MODULE_OPTIONS = [
  { key: 'events', label: 'Events Management', desc: 'Create, update, and manage studio events' },
  { key: 'gallery', label: 'Photo Gallery', desc: 'Upload, manage, and delete event photographs' },
  { key: 'qr_codes', label: 'Event QR Codes', desc: 'Generate, regenerate, and toggle event QR codes' },
  { key: 'ai_recognition', label: 'AI Face Recognition', desc: 'Index event faces and manage AI engine settings' },
  { key: 'guest_activity', label: 'Guest Activity & Reports', desc: 'View guest activity analytics and export reports' },
]

function AdminAdministrators() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState('admins') // 'admins' | 'audit'

  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [resettingAdmin, setResettingAdmin] = useState(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'regular_admin',
    password: '',
    must_change_password: true,
    sidebar_permissions: ['events', 'gallery'],
  })
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit form state
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    is_active: true,
    must_change_password: false,
    sidebar_permissions: [],
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  // Reset password form state
  const [resetForm, setResetForm] = useState({
    new_password: '',
    must_change_password: true,
  })
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState('')

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)

  const loadAdmins = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdministrators()
      const list = Array.isArray(data) ? data : (data?.results || [])
      setAdmins(list)
    } catch (err) {
      setError(err.message || 'Failed to load administrator accounts.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const data = await fetchAdministratorAuditLogs()
      const list = Array.isArray(data) ? data : (data?.results || [])
      setAuditLogs(list)
    } catch (err) {
      setError(err.message || 'Failed to load administrator audit logs.')
    } finally {
      setAuditLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAdmins()
  }, [loadAdmins])

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs()
    }
  }, [activeTab, loadAuditLogs])

  const showNotification = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // Create Admin Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSubmitting(true)
    try {
      const payload = {
        username: createForm.username.trim(),
        email: createForm.email.trim(),
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        role: createForm.role,
        password: createForm.password,
        must_change_password: createForm.must_change_password,
        sidebar_permissions: createForm.role === 'super_admin' ? [] : createForm.sidebar_permissions,
      }
      await createAdministrator(payload)
      setShowCreateModal(false)
      setCreateForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'regular_admin',
        password: '',
        must_change_password: true,
        sidebar_permissions: ['events', 'gallery'],
      })
      showNotification('New administrator account successfully provisioned.')
      loadAdmins()
    } catch (err) {
      const msg =
        err.fieldErrors?.username?.[0] ||
        err.fieldErrors?.email?.[0] ||
        err.fieldErrors?.password?.[0] ||
        err.fieldErrors?.detail ||
        err.message ||
        'Failed to create administrator.'
      setCreateError(msg)
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Edit Admin Handlers
  const openEditModal = (admin) => {
    setEditingAdmin(admin)
    setEditError('')
    setEditForm({
      email: admin.email || '',
      first_name: admin.first_name || '',
      last_name: admin.last_name || '',
      is_active: admin.is_active,
      must_change_password: Boolean(admin.must_change_password),
      sidebar_permissions: Array.isArray(admin.permissions) ? admin.permissions : [],
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingAdmin) return
    setEditError('')
    setEditSubmitting(true)
    try {
      const payload = {
        email: editForm.email.trim(),
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        is_active: editForm.is_active,
        must_change_password: editForm.must_change_password,
      }
      if (editingAdmin.role === 'regular_admin') {
        payload.sidebar_permissions = editForm.sidebar_permissions
      }
      await updateAdministrator(editingAdmin.id, payload)
      setEditingAdmin(null)
      showNotification(`Administrator "${editingAdmin.username}" updated successfully.`)
      loadAdmins()
    } catch (err) {
      const msg =
        err.fieldErrors?.email?.[0] ||
        err.fieldErrors?.detail ||
        err.message ||
        'Failed to update administrator.'
      setEditError(msg)
    } finally {
      setEditSubmitting(false)
    }
  }

  // Toggle Activation
  const handleToggleActivate = async (admin) => {
    const actionLabel = admin.is_active ? 'deactivate' : 'activate'
    if (!window.confirm(`Are you sure you want to ${actionLabel} administrator "${admin.username}"?`)) {
      return
    }
    try {
      if (admin.is_active) {
        await deactivateAdministrator(admin.id)
        showNotification(`Administrator "${admin.username}" deactivated and sessions revoked.`)
      } else {
        await activateAdministrator(admin.id)
        showNotification(`Administrator "${admin.username}" activated successfully.`)
      }
      loadAdmins()
    } catch (err) {
      setError(err.message || `Failed to ${actionLabel} administrator.`)
    }
  }

  // Reset Password Handlers
  const openResetModal = (admin) => {
    setResettingAdmin(admin)
    setResetError('')
    setResetForm({
      new_password: '',
      must_change_password: true,
    })
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (!resettingAdmin) return
    setResetError('')
    setResetSubmitting(true)
    try {
      await resetAdministratorPassword(resettingAdmin.id, {
        new_password: resetForm.new_password,
        must_change_password: resetForm.must_change_password,
      })
      setResettingAdmin(null)
      showNotification(`Temporary password set for "${resettingAdmin.username}".`)
      loadAdmins()
    } catch (err) {
      const msg =
        err.fieldErrors?.new_password?.[0] ||
        err.fieldErrors?.detail ||
        err.message ||
        'Failed to reset password.'
      setResetError(msg)
    } finally {
      setResetSubmitting(false)
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-users__header">
        <div>
          <span className="admin-users__eyebrow">SUPER ADMIN CONSOLE</span>
          <h1 className="admin-users__title">Administrator Management</h1>
          <p className="admin-users__subtitle">
            Provision studio administrators, configure modular sidebar permissions, and audit security actions.
          </p>
        </div>
        <div className="admin-users__header-actions">
          <button
            type="button"
            className="admin-users__create-btn"
            onClick={() => setShowCreateModal(true)}
          >
            + Provision New Administrator
          </button>
        </div>
      </div>

      {successMsg && <div className="admin-users__alert is-success">{successMsg}</div>}
      {error && <div className="admin-users__alert is-error">{error}</div>}

      <div className="admin-users__tabs">
        <button
          type="button"
          className={`admin-users__tab-btn ${activeTab === 'admins' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          Administrators ({admins.length})
        </button>
        <button
          type="button"
          className={`admin-users__tab-btn ${activeTab === 'audit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Security Audit Trail
        </button>
      </div>

      {activeTab === 'admins' && (
        <div className="admin-users__table-wrap">
          {loading ? (
            <div className="admin-users__loading">Loading studio administrators...</div>
          ) : (
            <table className="admin-users__table">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Permitted Modules</th>
                  <th>Password Flag</th>
                  <th className="is-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm) => {
                  const isSelf = adm.id === currentUser?.id
                  return (
                    <tr key={adm.id} className={!adm.is_active ? 'is-inactive-row' : ''}>
                      <td>
                        <div className="admin-users__user-cell">
                          <strong>{adm.username}</strong>
                          <span className="admin-users__user-sub">
                            {adm.first_name || adm.last_name
                              ? `${adm.first_name} ${adm.last_name}`
                              : 'No name'} &bull; {adm.email}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-users__role-badge is-${adm.role}`}>
                          {adm.role === 'super_admin' ? 'Super Admin' : 'Regular Admin'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-users__status-badge ${adm.is_active ? 'is-active' : 'is-inactive'}`}>
                          {adm.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-users__perms-pills">
                          {adm.role === 'super_admin' ? (
                            <span className="admin-users__perm-tag is-all">Full Studio Access</span>
                          ) : adm.permissions && adm.permissions.length > 0 ? (
                            adm.permissions.map((p) => (
                              <span key={p} className="admin-users__perm-tag">
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="admin-users__perm-tag is-none">Overview Only</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {adm.must_change_password ? (
                          <span className="admin-users__pwd-flag is-forced">Must Change</span>
                        ) : (
                          <span className="admin-users__pwd-flag is-normal">Verified</span>
                        )}
                      </td>
                      <td className="is-right">
                        <div className="admin-users__row-actions">
                          <button
                            type="button"
                            className="admin-users__action-btn"
                            onClick={() => openEditModal(adm)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-users__action-btn"
                            onClick={() => openResetModal(adm)}
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            className={`admin-users__action-btn ${adm.is_active ? 'is-danger' : 'is-success'}`}
                            onClick={() => handleToggleActivate(adm)}
                            disabled={isSelf}
                            title={isSelf ? 'Cannot deactivate your own account' : ''}
                          >
                            {adm.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="admin-users__table-wrap">
          {auditLoading ? (
            <div className="admin-users__loading">Loading security audit records...</div>
          ) : auditLogs.length === 0 ? (
            <div className="admin-users__empty">No audit events recorded yet.</div>
          ) : (
            <table className="admin-users__table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Admin</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="admin-users__time">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <strong>{log.actor_username || 'System'}</strong>
                    </td>
                    <td>
                      <span className="admin-users__action-tag">{log.action_display || log.action}</span>
                    </td>
                    <td>{log.target_username || '—'}</td>
                    <td>
                      <code>{log.ip_address || '—'}</code>
                    </td>
                    <td>
                      <small className="admin-users__log-details">
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="admin-users__modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="admin-users__modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-users__modal-header">
              <h3>Provision New Administrator</h3>
              <button
                type="button"
                className="admin-users__close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                &times;
              </button>
            </div>

            {createError && <div className="admin-users__modal-error">{createError}</div>}

            <form onSubmit={handleCreateSubmit} className="admin-users__form">
              <div className="admin-users__form-grid">
                <div className="admin-users__form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="e.g. sarah_editor"
                  />
                </div>
                <div className="admin-users__form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="sarah@smartstudio.com"
                  />
                </div>
              </div>

              <div className="admin-users__form-grid">
                <div className="admin-users__form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  />
                </div>
                <div className="admin-users__form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-users__form-grid">
                <div className="admin-users__form-group">
                  <label>Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min 8 characters"
                  />
                </div>
                <div className="admin-users__form-group">
                  <label>Administrative Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="regular_admin">Regular Admin (Custom Permissions)</option>
                    <option value="super_admin">Super Admin (Full Studio Access)</option>
                  </select>
                </div>
              </div>

              <div className="admin-users__checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.must_change_password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, must_change_password: e.target.checked })
                    }
                  />
                  Require password change on first login (Recommended)
                </label>
              </div>

              {createForm.role === 'regular_admin' && (
                <div className="admin-users__permissions-box">
                  <label className="admin-users__box-title">Assigned Sidebar Modules</label>
                  <p className="admin-users__box-sub">
                    Select the specific modules this administrator is authorized to access:
                  </p>
                  <div className="admin-users__checkbox-list">
                    {MODULE_OPTIONS.map((m) => {
                      const checked = createForm.sidebar_permissions.includes(m.key)
                      return (
                        <label key={m.key} className="admin-users__perm-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const newPerms = e.target.checked
                                ? [...createForm.sidebar_permissions, m.key]
                                : createForm.sidebar_permissions.filter((k) => k !== m.key)
                              setCreateForm({ ...createForm, sidebar_permissions: newPerms })
                            }}
                          />
                          <div>
                            <strong>{m.label}</strong>
                            <span>{m.desc}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="admin-users__modal-footer">
                <button
                  type="button"
                  className="admin-users__cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-users__submit-btn"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Provisioning...' : 'Provision Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingAdmin && (
        <div className="admin-users__modal-backdrop" onClick={() => setEditingAdmin(null)}>
          <div className="admin-users__modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-users__modal-header">
              <h3>Edit Administrator: {editingAdmin.username}</h3>
              <button
                type="button"
                className="admin-users__close-btn"
                onClick={() => setEditingAdmin(null)}
              >
                &times;
              </button>
            </div>

            {editError && <div className="admin-users__modal-error">{editError}</div>}

            <form onSubmit={handleEditSubmit} className="admin-users__form">
              <div className="admin-users__form-grid">
                <div className="admin-users__form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="admin-users__form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-users__form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              <div className="admin-users__checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.must_change_password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, must_change_password: e.target.checked })
                    }
                  />
                  Force password change on next login
                </label>
              </div>

              {editingAdmin.role === 'regular_admin' && (
                <div className="admin-users__permissions-box">
                  <label className="admin-users__box-title">Sidebar Module Permissions</label>
                  <div className="admin-users__checkbox-list">
                    {MODULE_OPTIONS.map((m) => {
                      const checked = editForm.sidebar_permissions.includes(m.key)
                      return (
                        <label key={m.key} className="admin-users__perm-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const newPerms = e.target.checked
                                ? [...editForm.sidebar_permissions, m.key]
                                : editForm.sidebar_permissions.filter((k) => k !== m.key)
                              setEditForm({ ...editForm, sidebar_permissions: newPerms })
                            }}
                          />
                          <div>
                            <strong>{m.label}</strong>
                            <span>{m.desc}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="admin-users__modal-footer">
                <button
                  type="button"
                  className="admin-users__cancel-btn"
                  onClick={() => setEditingAdmin(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-users__submit-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingAdmin && (
        <div className="admin-users__modal-backdrop" onClick={() => setResettingAdmin(null)}>
          <div className="admin-users__modal admin-users__modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-users__modal-header">
              <h3>Reset Password: {resettingAdmin.username}</h3>
              <button
                type="button"
                className="admin-users__close-btn"
                onClick={() => setResettingAdmin(null)}
              >
                &times;
              </button>
            </div>

            {resetError && <div className="admin-users__modal-error">{resetError}</div>}

            <form onSubmit={handleResetSubmit} className="admin-users__form">
              <div className="admin-users__form-group">
                <label>New Temporary Password (min 8 characters)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetForm.new_password}
                  onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
                  placeholder="Enter temporary password"
                />
              </div>

              <div className="admin-users__checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={resetForm.must_change_password}
                    onChange={(e) =>
                      setResetForm({ ...resetForm, must_change_password: e.target.checked })
                    }
                  />
                  Require password change on next login
                </label>
              </div>

              <div className="admin-users__modal-footer">
                <button
                  type="button"
                  className="admin-users__cancel-btn"
                  onClick={() => setResettingAdmin(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-users__submit-btn"
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? 'Resetting...' : 'Set Temporary Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAdministrators

