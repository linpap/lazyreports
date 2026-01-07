import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Loader2, Calendar, Copy, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi, domainsApi } from '../services/api';

const tabs = [
  { id: 'profile', label: 'Profile Settings' },
  { id: 'api', label: 'API Control' },
  { id: 'offers', label: 'Company Offers' },
  { id: 'users', label: 'Company Users' },
  { id: 'affiliates', label: 'Affiliate Accounts' },
];

function ProfileSettingsTab() {
  const { user } = useAuthStore();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      dateOfBirth: '',
      im: '',
    },
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, reset: resetPassword } = useForm();

  const updateMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed');
      resetPassword();
      setShowPasswordForm(false);
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    },
  });

  const onPasswordSubmit = (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    passwordMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
        {/* Email, First name, Last name row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="label">Email:</label>
            <input
              {...register('email')}
              type="email"
              className="input bg-secondary-100"
            />
          </div>
          <div>
            <label className="label">First name:</label>
            <input
              {...register('firstName')}
              className="input bg-secondary-100"
            />
          </div>
          <div>
            <label className="label">Last name:</label>
            <input
              {...register('lastName')}
              className="input bg-secondary-100"
            />
          </div>
        </div>

        {/* Password row */}
        <div className="mb-6">
          <label className="label">Password:</label>
          {!showPasswordForm ? (
            <button
              type="button"
              onClick={() => setShowPasswordForm(true)}
              className="btn btn-secondary"
            >
              Reset Password
            </button>
          ) : (
            <div className="mt-2 p-4 border border-secondary-200 rounded-lg space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  {...registerPassword('currentPassword', { required: true })}
                  type="password"
                  className="input max-w-md"
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  {...registerPassword('newPassword', { required: true, minLength: 6 })}
                  type="password"
                  className="input max-w-md"
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  {...registerPassword('confirmPassword', { required: true })}
                  type="password"
                  className="input max-w-md"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePasswordSubmit(onPasswordSubmit)}
                  disabled={passwordMutation.isPending}
                  className="btn btn-primary"
                >
                  {passwordMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    resetPassword();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date of Birth and IM row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="label">Date of Birth:</label>
            <div className="relative">
              <input
                {...register('dateOfBirth')}
                type="date"
                className="input bg-secondary-100"
              />
            </div>
          </div>
          <div>
            <label className="label">IM:</label>
            <input
              {...register('im')}
              className="input bg-secondary-100"
            />
          </div>
        </div>

        {/* Edit Profile button */}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="btn btn-primary px-8"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : null}
          Edit Profile
        </button>
      </form>
    </div>
  );
}

function APIControlTab() {
  const { user } = useAuthStore();

  // Mock API key data - in production this would come from an API
  const apiKeyData = {
    apiKey: user?.apiKey || 'gbA9Nhff',
    timeInterval: 1,
    allowedRequests: 24,
    rowsServed: 344827,
    totalRequests: 714,
    lastRequestTime: '2017-06-14 08:07:49',
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKeyData.apiKey);
    toast.success('API Key copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* API Key Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary-600 text-white">
              <th className="px-4 py-3 text-left text-sm font-medium">ApiKey</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Time Interval</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Allowed Requests</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Rows Served</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Total Requests</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Last Request Time</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-secondary-200">
              <td className="px-4 py-3 text-sm text-secondary-700 font-mono">{apiKeyData.apiKey}</td>
              <td className="px-4 py-3 text-sm text-secondary-700">{apiKeyData.timeInterval}</td>
              <td className="px-4 py-3 text-sm text-secondary-700">{apiKeyData.allowedRequests}</td>
              <td className="px-4 py-3 text-sm text-secondary-700">{apiKeyData.rowsServed.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-secondary-700">{apiKeyData.totalRequests.toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-secondary-700">{apiKeyData.lastRequestTime}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Copy Button */}
      <div>
        <button
          onClick={handleCopyApiKey}
          className="btn btn-primary flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
      </div>

      {/* Documentation Link */}
      <div className="text-center pt-4">
        <p className="text-secondary-600">
          Documentation for the api is located{' '}
          <a
            href="https://reporting.lazysauce.com/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            HERE
          </a>
        </p>
      </div>
    </div>
  );
}

function CompanyOffersTab() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch user's domains
  const { data: domainsData, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];

  // Filter domains by search term (case sensitive as per screenshot)
  const filteredDomains = searchTerm
    ? domains.filter(d => d.name?.includes(searchTerm))
    : domains;

  const handleEdit = (domain) => {
    toast.success(`Edit ${domain.name} - Feature coming soon`);
  };

  const handleDelete = (domain) => {
    toast.success(`Delete ${domain.name} - Feature coming soon`);
  };

  const handleAddNew = () => {
    toast.success('Add New - Feature coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAddNew}
          className="btn btn-primary"
        >
          Add New
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <label className="label">Search Domain Name</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search is case sensitive"
          className="input"
        />
      </div>

      {/* Domains Table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full max-w-2xl">
            <thead>
              <tr className="bg-secondary-600 text-white">
                <th className="px-4 py-3 text-left text-sm font-medium">Domain Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-secondary-500">
                    No domains found
                  </td>
                </tr>
              ) : (
                filteredDomains.map((domain) => (
                  <tr key={domain.dkey} className="border-b border-secondary-200">
                    <td className="px-4 py-3 text-sm text-secondary-700">{domain.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(domain)}
                          className="px-3 py-1 text-xs border border-secondary-300 rounded hover:bg-secondary-50 text-secondary-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(domain)}
                          className="px-3 py-1 text-xs border border-secondary-300 rounded hover:bg-red-50 text-secondary-600 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompanyUsersTab() {
  const [searchTerm, setSearchTerm] = useState('');

  // Mock company users data - in production this would come from an API
  const companyUsers = [
    { id: 1, name: 'Michael Cech', email: 'michael.cech@searchlightsolutions.com', permissions: 'Owner' },
    { id: 2, name: 'Ian Ho', email: 'ian.ho@rebootmedia.net', permissions: 'Owner' },
    { id: 3, name: 'Ankit Agarwal', email: 'ankit@theleadgroup.com', permissions: 'Admin' },
    { id: 4, name: 'Raquel Fabrizio', email: 'raquel@theleadgroup.com', permissions: 'User' },
    { id: 5, name: 'Angel Hernandez', email: 'angel@theleadgroup.com', permissions: 'User' },
    { id: 6, name: 'Arsh user', email: 'linpap@gmail.com', permissions: 'User' },
    { id: 7, name: 'Michael David', email: 'michaeldavid@theleadgroup.com', permissions: 'Admin' },
  ];

  // Filter users by search term (case insensitive as per screenshot)
  const filteredUsers = searchTerm
    ? companyUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : companyUsers;

  const handleEdit = (user) => {
    toast.success(`Edit ${user.name} - Feature coming soon`);
  };

  const handleDelete = (user) => {
    toast.success(`Delete ${user.name} - Feature coming soon`);
  };

  const handleAddNew = () => {
    toast.success('Add New User - Feature coming soon');
  };

  return (
    <div className="space-y-6">
      {/* Add New Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAddNew}
          className="btn btn-primary"
        >
          Add New
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <label className="label">Search Company User</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search is case insensitive"
          className="input"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-secondary-600 text-white">
              <th className="px-4 py-3 text-left text-sm font-medium">User Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Permissions</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-secondary-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-secondary-200">
                  <td className="px-4 py-3 text-sm text-secondary-700">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-secondary-700">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-secondary-700">{user.permissions}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1 text-xs border border-secondary-300 rounded hover:bg-secondary-50 text-secondary-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="px-3 py-1 text-xs border border-secondary-300 rounded hover:bg-red-50 text-secondary-600 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AffiliateAccountsTab() {
  return (
    <div className="text-secondary-500 text-center py-8">
      Affiliate Accounts settings coming soon...
    </div>
  );
}

export default function Accounts() {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettingsTab />;
      case 'api':
        return <APIControlTab />;
      case 'offers':
        return <CompanyOffersTab />;
      case 'users':
        return <CompanyUsersTab />;
      case 'affiliates':
        return <AffiliateAccountsTab />;
      default:
        return <ProfileSettingsTab />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-secondary-900 mb-6">Accounts</h1>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 mb-6 border-b border-secondary-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="border border-secondary-200 rounded-lg p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
