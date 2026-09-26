import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/db';
import { CreateUserPayload, UserProfile, UserRole } from '../../types';
import {
  UserPlus,
  Shield,
  Users,
  Search,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  BadgeCheck,
  Edit,
  Trash2,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { isSuperAdmin, users, refreshUsers } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const handleDeleteUser = async (user: UserProfile) => {
    if (confirm(`Are you sure you want to delete user ${user.full_name}?`)) {
      const res = await db.deleteUser(user.id);
      if (res.success) {
        refreshUsers();
      } else {
        alert(res.error || 'Failed to delete user.');
      }
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto my-12 shadow-xs">
        <Shield className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          User Management is exclusively permitted for Super Administrators
          (<code className="font-mono text-indigo-700 font-semibold">COE</code>,{' '}
          <code className="font-mono text-indigo-700 font-semibold">DYCOE</code>,{' '}
          <code className="font-mono text-indigo-700 font-semibold">ACOE</code>) per university RBAC policy.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      COE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      DYCOE: 'bg-violet-50 text-violet-700 border-violet-200',
      ACOE: 'bg-sky-50 text-sky-700 border-sky-200',
      COORDINATOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${colors[role]}`}>
        {role}
      </span>
    );
  };

  const roleStats = {
    total: users.length,
    coe: users.filter((u) => u.role === 'COE').length,
    dycoe: users.filter((u) => u.role === 'DYCOE').length,
    acoe: users.filter((u) => u.role === 'ACOE').length,
    coordinator: users.filter((u) => u.role === 'COORDINATOR').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            User Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create and manage staff accounts for the examination department
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          Create New User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Users', value: roleStats.total, color: 'bg-slate-100 text-slate-800 border-slate-200' },
          { label: 'COE', value: roleStats.coe, color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
          { label: 'DYCOE', value: roleStats.dycoe, color: 'bg-violet-50 text-violet-800 border-violet-200' },
          { label: 'ACOE', value: roleStats.acoe, color: 'bg-sky-50 text-sky-800 border-sky-200' },
          { label: 'Coordinators', value: roleStats.coordinator, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} border rounded-lg px-3 py-2.5 text-center`}>
            <div className="text-xl font-bold">{stat.value}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row gap-3 shadow-xs">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
        >
          <option value="ALL">All Roles</option>
          <option value="COE">COE</option>
          <option value="DYCOE">DYCOE</option>
          <option value="ACOE">ACOE</option>
          <option value="COORDINATOR">COORDINATOR</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Department</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Created</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-slate-600">{user.email}</span>
                  </td>
                  <td className="px-4 py-3">{roleBadge(user.role)}</td>
                  <td className="px-4 py-3 text-slate-600">{user.title || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{user.department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refreshUsers();
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={() => {
            setEditingUser(null);
            refreshUsers();
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// Create User Modal
// ============================================================================

interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState<CreateUserPayload>({
    email: '',
    password: '',
    full_name: '',
    role: 'COORDINATOR',
    department: 'Examination Department',
    phone: '',
    title: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const titleSuggestions: Record<UserRole, string> = {
    COE: 'Controller of Examinations',
    DYCOE: 'Deputy Controller of Examinations',
    ACOE: 'Assistant Controller of Examinations',
    COORDINATOR: 'Exam Coordinator',
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      title: titleSuggestions[role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Email, password, and full name are required.');
      setIsSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsSubmitting(false);
      return;
    }

    const result = await db.createUser(formData);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => onCreated(), 1500);
    } else {
      setError(result.error || 'Failed to create user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <UserPlus className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create New User</h3>
              <p className="text-[11px] text-slate-500">Add a new staff member to the examination system</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">User created successfully! Refreshing...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
              placeholder="e.g., Dr. Keshav Jankar"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              <Mail className="w-3 h-3 inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="e.g., keshav@university.edu"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Min 6 characters"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
              minLength={6}
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['COE', 'DYCOE', 'ACOE', 'COORDINATOR'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    formData.role === role
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Controller of Examinations"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          {/* Department & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                <Building2 className="w-3 h-3 inline mr-1" />
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Examination Dept."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                <Phone className="w-3 h-3 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g., +91-9876543210"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// Edit User Modal
// ============================================================================

interface EditUserModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUpdated }) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    full_name: user.full_name,
    role: user.role,
    department: user.department || '',
    phone: user.phone || '',
    title: user.title || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const titleSuggestions: Record<UserRole, string> = {
    COE: 'Controller of Examinations',
    DYCOE: 'Deputy Controller of Examinations',
    ACOE: 'Assistant Controller of Examinations',
    COORDINATOR: 'Exam Coordinator',
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData((prev) => ({
      ...prev,
      role,
      title: titleSuggestions[role],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!formData.full_name) {
      setError('Full name is required.');
      setIsSubmitting(false);
      return;
    }

    const result = await db.updateUserProfile(user.id, formData);
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => onUpdated(), 1000);
    } else {
      setError(result.error || 'Failed to update user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Edit className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit User</h3>
              <p className="text-[11px] text-slate-500">Update staff member details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">User updated successfully! Refreshing...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">Role *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['COE', 'DYCOE', 'ACOE', 'COORDINATOR'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                    formData.role === role
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
