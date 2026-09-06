import React, { useState } from 'react';
import { X, Send, FileText } from 'lucide-react';
import { createCircular } from '../lib/api';

const CIRCULAR_TEMPLATES = {
  bridge_damage: {
    title: "Bridge Damage - Alternate Route Required",
    message: "Bridge on [LOCATION] damaged. Use alternate route via [ALTERNATE]. Expected repair: [DAYS] days.",
    severity: "high"
  },
  power_outage: {
    title: "Power Restoration Update",
    message: "Power restoration in [AREA] expected by [TIME]. Contact helpline: 1912",
    severity: "low"
  },
  medical_deployment: {
    title: "Medical Teams Deployed",
    message: "Mobile medical units deployed to [AREA]. Contact disaster helpline: 1078",
    severity: "low"
  },
  relief_distribution: {
    title: "Relief Supplies Distribution",
    message: "Food and supplies at [CENTER] from [TIME]. Bring ID for registration.",
    severity: "low"
  },
  road_blockage: {
    title: "Road Blockage - Avoid Travel",
    message: "[ROAD] is blocked/waterlogged. Avoid area. Use alternate route via [ALTERNATE].",
    severity: "medium"
  },
  custom: {
    title: "",
    message: "",
    severity: "low"
  }
};

const CreateCircularModal = ({ isOpen, onClose, onSuccess, currentUser }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    severity: 'low',
    district: currentUser?.district || '',
    state: currentUser?.state || '',
    expires_at: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    const template = CIRCULAR_TEMPLATES[templateKey];
    setFormData(prev => ({
      ...prev,
      title: template.title,
      message: template.message,
      severity: template.severity
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createCircular(formData);
      onSuccess && onSuccess();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create circular');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      message: '',
      severity: 'low',
      district: currentUser?.district || '',
      state: currentUser?.state || '',
      expires_at: ''
    });
    setSelectedTemplate('custom');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-6 w-6 mr-3" />
                <h2 className="text-xl font-bold">Create Information Circular</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(CIRCULAR_TEMPLATES).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateSelect(key)}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition ${
                      selectedTemplate === key
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief title for the circular"
                required
              />
            </div>

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="6"
                placeholder="Detailed message with instructions, locations, timings, contact numbers, etc."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Tip: Include specific locations, alternate routes, timings, and contact numbers
              </p>
            </div>

            {/* Severity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Low - General information</option>
                <option value="medium">Medium - Important update</option>
                <option value="high">High - Urgent notice</option>
                <option value="critical">Critical - Emergency situation</option>
              </select>
            </div>

            {/* Location Targeting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District {currentUser?.district && <span className="text-xs text-gray-500">(Your district)</span>}
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty for state-wide"
                  disabled={!!currentUser?.district}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State {currentUser?.state && <span className="text-xs text-gray-500">(Your state)</span>}
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave empty for nationwide"
                  disabled={!!currentUser?.state}
                />
              </div>
            </div>

            {/* Expiration */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Date/Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for permanent circular (until manually deactivated)
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Publish Circular
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCircularModal;
