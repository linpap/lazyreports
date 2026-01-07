import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Lock, Settings2, Save, Loader2, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi, settingsApi, domainsApi } from '../services/api';

function UserSettingsSection() {
  const queryClient = useQueryClient();
  const [defaultReport, setDefaultReport] = useState('');
  const [defaultDate, setDefaultDate] = useState('today');
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [offerFilter, setOfferFilter] = useState('');
  const [showOfferDropdown, setShowOfferDropdown] = useState(false);

  // Fetch user settings
  const { data: settingsData } = useQuery({
    queryKey: ['user-settings'],
    queryFn: () => settingsApi.getSettings(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch domains for offer selection
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;
  const settings = settingsData?.data?.data || {};

  // Initialize state from settings
  useEffect(() => {
    if (settings.default_report) {
      setDefaultReport(settings.default_report);
    }
    if (settings.default_date?.dateType) {
      setDefaultDate(settings.default_date.dateType);
    }
    if (settings.timezone) {
      setTimezoneFilter(settings.timezone);
    }
  }, [settings]);

  // Get all timezones
  const timezones = Intl.supportedValuesOf('timeZone');
  const filteredTimezones = timezoneFilter
    ? timezones.filter(tz => tz.toLowerCase().includes(timezoneFilter.toLowerCase()))
    : timezones;

  // Filter domains for autocomplete
  const filteredDomains = offerFilter
    ? domains.filter(d => d.name?.toLowerCase().includes(offerFilter.toLowerCase()))
    : domains;

  // Mutations
  const saveReportMutation = useMutation({
    mutationFn: (reportType) => settingsApi.saveDefaultReport(reportType),
    onSuccess: () => queryClient.invalidateQueries(['user-settings']),
  });

  const saveDateMutation = useMutation({
    mutationFn: (dateType) => settingsApi.saveDefaultDate({ dateType }),
    onSuccess: () => queryClient.invalidateQueries(['user-settings']),
  });

  const saveTimezoneMutation = useMutation({
    mutationFn: (timezone) => settingsApi.saveTimezone(timezone),
    onSuccess: () => queryClient.invalidateQueries(['user-settings']),
  });

  const saveOfferMutation = useMutation({
    mutationFn: ({ dkey, offerName }) => domainsApi.saveDefaultOffer(dkey, offerName),
    onSuccess: () => queryClient.invalidateQueries(['domains']),
  });

  const handleSave = async () => {
    try {
      await Promise.all([
        saveReportMutation.mutateAsync(defaultReport),
        saveDateMutation.mutateAsync(defaultDate),
      ]);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleClearOffer = async () => {
    try {
      await saveOfferMutation.mutateAsync({ dkey: null, offerName: 'Default Offer Deleted' });
      toast.success('Default offer cleared');
    } catch (error) {
      toast.error('Failed to clear default offer');
    }
  };

  const handleSelectOffer = async (domain) => {
    try {
      await saveOfferMutation.mutateAsync({ dkey: domain.dkey, offerName: domain.name });
      setOfferFilter('');
      setShowOfferDropdown(false);
      toast.success('Default offer updated');
    } catch (error) {
      toast.error('Failed to update default offer');
    }
  };

  const handleSelectTimezone = async (tz) => {
    try {
      await saveTimezoneMutation.mutateAsync(tz);
      setTimezoneFilter(tz);
      setShowTimezoneDropdown(false);
      toast.success('Timezone updated');
    } catch (error) {
      toast.error('Failed to update timezone');
    }
  };

  const isSaving = saveReportMutation.isPending || saveDateMutation.isPending;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-secondary-900">User Settings</h2>
        </div>
        <p className="text-sm text-secondary-500 mt-1">
          Below are your personal settings, clicking 'Save' will refresh the page.
        </p>
      </div>

      <div className="card-body space-y-6">
        {/* Default Report & Default Date Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Default Report</label>
            <select
              value={defaultReport}
              onChange={(e) => setDefaultReport(e.target.value)}
              className="input"
            >
              <option value="">Select a report...</option>
              <option value="variant">Variant</option>
              <option value="channel">Channel</option>
              <option value="subchannel">SubChannel</option>
              <option value="keyword">Keyword</option>
              <option value="country">Country</option>
              <option value="device">Device</option>
            </select>
          </div>

          <div>
            <label className="label">Default Date</label>
            <select
              value={defaultDate}
              onChange={(e) => setDefaultDate(e.target.value)}
              className="input"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>
        </div>

        {/* Current Default Offer & Change Default Offer Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Current Default Offer</label>
            {defaultOffer ? (
              <div className="flex items-center gap-2">
                <span className="flex-1 px-3 py-2 bg-secondary-100 rounded-lg text-sm text-secondary-700">
                  {defaultOffer.name}
                </span>
                <button
                  onClick={handleClearOffer}
                  className="p-2 text-secondary-400 hover:text-red-500 transition-colors"
                  title="Clear default offer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="px-3 py-2 bg-secondary-50 rounded-lg text-sm text-secondary-400 italic">
                No default offer set
              </div>
            )}
          </div>

          <div>
            <label className="label">Change Default Offer</label>
            <div className="relative">
              <input
                type="text"
                value={offerFilter}
                onChange={(e) => {
                  setOfferFilter(e.target.value);
                  setShowOfferDropdown(true);
                }}
                onFocus={() => setShowOfferDropdown(true)}
                placeholder="Start typing..."
                className="input"
              />
              {showOfferDropdown && filteredDomains.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredDomains.slice(0, 20).map((domain) => (
                    <button
                      key={domain.dkey}
                      onClick={() => handleSelectOffer(domain)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                    >
                      {domain.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Time zone & Change Time zone Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Current Time zone</label>
            <div className="px-3 py-2 bg-secondary-100 rounded-lg text-sm text-secondary-700">
              {settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            </div>
          </div>

          <div>
            <label className="label">Change Time zone</label>
            <div className="relative">
              <input
                type="text"
                value={timezoneFilter}
                onChange={(e) => {
                  setTimezoneFilter(e.target.value);
                  setShowTimezoneDropdown(true);
                }}
                onFocus={() => setShowTimezoneDropdown(true)}
                placeholder="Start typing..."
                className="input"
              />
              {showTimezoneDropdown && filteredTimezones.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {filteredTimezones.slice(0, 20).map((tz) => (
                    <button
                      key={tz}
                      onClick={() => handleSelectTimezone(tz)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                    >
                      {tz}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-secondary-200 flex gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </button>
      </div>
    </div>
  );
}

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
        <UserSettingsSection />
        <ProfileSection />
        <PasswordSection />
      </div>
    </div>
  );
}
