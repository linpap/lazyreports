import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, Globe, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi, settingsApi } from '../services/api';

function ProfileSection() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => authApi.updateProfile(data),
    onSuccess: () => {
      toast.success('Profile updated');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-secondary-500" />
          <h2 className="text-lg font-semibold text-secondary-900">Profile</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))}>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input {...register('firstName')} className="input" />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input {...register('lastName')} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input {...register('email')} type="email" className="input" />
          </div>
          <div>
            <label className="label">Username</label>
            <input value={user?.username || ''} disabled className="input bg-secondary-50" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-secondary-200">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordSection() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const changeMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed');
      reset();
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Failed to change password';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    changeMutation.mutate(data);
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-secondary-500" />
          <h2 className="text-lg font-semibold text-secondary-900">Change Password</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="card-body space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              {...register('currentPassword', { required: true })}
              type="password"
              className="input"
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              {...register('newPassword', { required: true, minLength: 6 })}
              type="password"
              className="input"
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              {...register('confirmPassword', { required: true })}
              type="password"
              className="input"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-secondary-200">
          <button
            type="submit"
            disabled={changeMutation.isPending}
            className="btn btn-primary"
          >
            {changeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Change Password
          </button>
        </div>
      </form>
    </div>
  );
}

function TimezoneSection() {
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.saveTimezone(timezone),
    onSuccess: () => {
      toast.success('Timezone saved');
    },
    onError: () => {
      toast.error('Failed to save timezone');
    },
  });

  const timezones = Intl.supportedValuesOf('timeZone');

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-secondary-500" />
          <h2 className="text-lg font-semibold text-secondary-900">Timezone</h2>
        </div>
      </div>
      <div className="card-body">
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="input"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="px-6 py-4 border-t border-secondary-200">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="btn btn-primary"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Timezone
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        <ProfileSection />
        <PasswordSection />
        <TimezoneSection />
      </div>
    </div>
  );
}
