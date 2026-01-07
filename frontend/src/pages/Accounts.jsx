import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Loader2, Calendar } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

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
  return (
    <div className="text-secondary-500 text-center py-8">
      API Control settings coming soon...
    </div>
  );
}

function CompanyOffersTab() {
  return (
    <div className="text-secondary-500 text-center py-8">
      Company Offers settings coming soon...
    </div>
  );
}

function CompanyUsersTab() {
  return (
    <div className="text-secondary-500 text-center py-8">
      Company Users settings coming soon...
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
