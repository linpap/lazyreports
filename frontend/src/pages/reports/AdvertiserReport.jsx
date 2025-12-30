import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Pencil, Trash2, X, Check,
  AlertCircle, Search, ChevronDown, ChevronUp
} from 'lucide-react';
import { advertisersApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import dayjs from 'dayjs';

export default function AdvertiserReport() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdvertiser, setNewAdvertiser] = useState({
    name: '',
    license: '',
    email: '',
    contact_name: '',
    db_host: '',
    billing_email: '',
    amount: 0,
    subscription_type: 'monthly',
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch advertisers
  const { data: advertisersData, isLoading, error } = useQuery({
    queryKey: ['advertisers'],
    queryFn: () => advertisersApi.getAll(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => advertisersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      setShowAddModal(false);
      setNewAdvertiser({
        name: '',
        license: '',
        email: '',
        contact_name: '',
        db_host: '',
        billing_email: '',
        amount: 0,
        subscription_type: 'monthly',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => advertisersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      setEditingId(null);
      setEditForm({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => advertisersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['advertisers']);
      setDeleteConfirm(null);
    },
  });

  const advertisers = advertisersData?.data?.data || [];

  // Filter and sort
  const filteredAdvertisers = advertisers
    .filter((adv) => {
      const search = searchTerm.toLowerCase();
      return (
        adv.name?.toLowerCase().includes(search) ||
        adv.license?.toLowerCase().includes(search) ||
        adv.email?.toLowerCase().includes(search) ||
        adv.contact_name?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEdit = (advertiser) => {
    setEditingId(advertiser.id);
    setEditForm({ ...advertiser });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    updateMutation.mutate({ id: editingId, data: editForm });
  };

  const handleCreate = () => {
    createMutation.mutate(newAdvertiser);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return dayjs(date).format('MMM D, YYYY');
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600">Error loading advertisers</p>
        <p className="text-secondary-500 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Advertiser Report</h1>
          <p className="text-secondary-600 mt-1">
            Manage all advertisers and their subscriptions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary inline-flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Advertiser
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search advertisers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                {[
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'license', label: 'License' },
                  { key: 'date_created', label: 'Created' },
                  { key: 'date_updated', label: 'Updated' },
                  { key: 'date_expired', label: 'Expires' },
                  { key: 'email', label: 'Email' },
                  { key: 'contact_name', label: 'Contact' },
                  { key: 'db_host', label: 'Domain' },
                  { key: 'billing_email', label: 'Billing' },
                  { key: 'amount', label: 'Cost' },
                  { key: 'subscription_type', label: 'Type' },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-3 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.key} />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filteredAdvertisers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <Building2 className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
                    <p className="text-secondary-500">No advertisers found</p>
                  </td>
                </tr>
              ) : (
                filteredAdvertisers.map((advertiser) => (
                  <tr key={advertiser.id} className="hover:bg-secondary-50">
                    {editingId === advertiser.id ? (
                      // Edit mode
                      <>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {advertiser.id}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="input input-sm w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.license || ''}
                            onChange={(e) => setEditForm({ ...editForm, license: e.target.value })}
                            className="input input-sm w-24"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {formatDate(advertiser.date_created)}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {formatDate(advertiser.date_updated)}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={editForm.date_expired ? dayjs(editForm.date_expired).format('YYYY-MM-DD') : ''}
                            onChange={(e) => setEditForm({ ...editForm, date_expired: e.target.value })}
                            className="input input-sm w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="input input-sm w-40"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.contact_name || ''}
                            onChange={(e) => setEditForm({ ...editForm, contact_name: e.target.value })}
                            className="input input-sm w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={editForm.db_host || ''}
                            onChange={(e) => setEditForm({ ...editForm, db_host: e.target.value })}
                            className="input input-sm w-32"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={editForm.billing_email || ''}
                            onChange={(e) => setEditForm({ ...editForm, billing_email: e.target.value })}
                            className="input input-sm w-40"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={editForm.amount || 0}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                            className="input input-sm w-20"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editForm.subscription_type || 'monthly'}
                            onChange={(e) => setEditForm({ ...editForm, subscription_type: e.target.value })}
                            className="input input-sm w-24"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="trial">Trial</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={saveEdit}
                              disabled={updateMutation.isPending}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-secondary-500 hover:bg-secondary-100 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View mode
                      <>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {advertiser.id}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-secondary-900">
                          {advertiser.name}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          {advertiser.license || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {formatDate(advertiser.date_created)}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {formatDate(advertiser.date_updated)}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-500">
                          {formatDate(advertiser.date_expired)}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          {advertiser.email || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          {advertiser.contact_name || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          {advertiser.db_host || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          {advertiser.billing_email || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-secondary-600">
                          ${advertiser.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            advertiser.subscription_type === 'yearly'
                              ? 'bg-green-100 text-green-700'
                              : advertiser.subscription_type === 'trial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {advertiser.subscription_type || 'monthly'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(advertiser)}
                              className="p-1.5 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(advertiser.id)}
                              className="p-1.5 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-elevated max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-secondary-900">Add Advertiser</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-secondary-100 rounded-lg"
              >
                <X className="w-5 h-5 text-secondary-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newAdvertiser.name}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, name: e.target.value })}
                  className="input"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  License
                </label>
                <input
                  type="text"
                  value={newAdvertiser.license}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, license: e.target.value })}
                  className="input"
                  placeholder="License key"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newAdvertiser.email}
                    onChange={(e) => setNewAdvertiser({ ...newAdvertiser, email: e.target.value })}
                    className="input"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={newAdvertiser.contact_name}
                    onChange={(e) => setNewAdvertiser({ ...newAdvertiser, contact_name: e.target.value })}
                    className="input"
                    placeholder="Contact person"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={newAdvertiser.db_host}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, db_host: e.target.value })}
                  className="input"
                  placeholder="domain.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={newAdvertiser.billing_email}
                  onChange={(e) => setNewAdvertiser({ ...newAdvertiser, billing_email: e.target.value })}
                  className="input"
                  placeholder="billing@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    value={newAdvertiser.amount}
                    onChange={(e) => setNewAdvertiser({ ...newAdvertiser, amount: parseFloat(e.target.value) || 0 })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Subscription Type
                  </label>
                  <select
                    value={newAdvertiser.subscription_type}
                    onChange={(e) => setNewAdvertiser({ ...newAdvertiser, subscription_type: e.target.value })}
                    className="input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-secondary-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newAdvertiser.name || createMutation.isPending}
                className="btn btn-primary"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Advertiser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-elevated max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900">Delete Advertiser</h3>
                <p className="text-secondary-600 mt-1">
                  Are you sure you want to delete this advertiser? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
