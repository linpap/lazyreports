import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Send, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function SubmitIssue() {
  const { user } = useAuthStore();
  const [problemTypes, setProblemTypes] = useState({
    reports: false,
    settings: false,
    other: false,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
      email: user?.email || '',
      subject: '',
      description: '',
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      // For now, just simulate submission
      // In production, this would send to an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Issue submitted:', { ...data, problemTypes });
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Issue submitted successfully. We will get back to you within 2 business days.');
      reset();
      setProblemTypes({ reports: false, settings: false, other: false });
    },
    onError: () => {
      toast.error('Failed to submit issue. Please try again.');
    },
  });

  const handleProblemTypeChange = (type) => {
    setProblemTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const onSubmit = (data) => {
    if (!problemTypes.reports && !problemTypes.settings && !problemTypes.other) {
      toast.error('Please select at least one problem type');
      return;
    }
    submitMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl mx-auto">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-primary-500">Submit Issue</h2>
          </div>
          <p className="text-sm text-secondary-600 mt-1">
            Please fill out the form and we will get back to you within 2 business days. If urgent, contact your account representative directly.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card-body space-y-6">
            {/* Full Name and Email row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <span className="text-red-500">*</span>Full Name
                </label>
                <input
                  {...register('fullName', { required: 'Full name is required' })}
                  className="input"
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>
                )}
              </div>
              <div>
                <label className="label">
                  <span className="text-red-500">*</span>Email
                </label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  className="input"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Problem type checkboxes */}
            <div>
              <label className="label">What are you having a problem with?</label>
              <div className="flex flex-wrap gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={problemTypes.reports}
                    onChange={() => handleProblemTypeChange('reports')}
                    className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">Reports</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={problemTypes.settings}
                    onChange={() => handleProblemTypeChange('settings')}
                    className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">Settings</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={problemTypes.other}
                    onChange={() => handleProblemTypeChange('other')}
                    className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">Other</span>
                </label>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="label">Subject</label>
              <input
                {...register('subject')}
                className="input"
                placeholder="Brief summary of the issue"
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Please describe your issue</label>
              <textarea
                {...register('description')}
                rows={6}
                className="input resize-none"
                placeholder="Provide as much detail as possible..."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-secondary-200">
            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="btn btn-primary"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
