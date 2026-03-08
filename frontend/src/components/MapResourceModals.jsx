import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { Shield, Home, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Deployment Modal
export const DeploymentModal = ({ initialCoords, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    team_name: '',
    unit_count: 1,
    personnel_count: '',
    equipment: '',
    latitude: initialCoords?.latitude?.toFixed(6) || '',
    longitude: initialCoords?.longitude?.toFixed(6) || '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/map/deployments', data),
    onSuccess: () => {
      toast.success('Rescue team deployed');
      onSuccess();
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || 
                       JSON.stringify(error.response?.data) || 
                       'Failed to deploy team';
      toast.error(errorMsg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      team_name: form.team_name,
      unit_count: parseInt(form.unit_count),
      personnel_count: form.personnel_count ? parseInt(form.personnel_count) : null,
      equipment: form.equipment || null,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      notes: form.notes || null,
    };
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
              <Shield size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deploy Rescue Team</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Team Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., NDRF Team Alpha"
                value={form.team_name}
                onChange={(e) => setForm({ ...form, team_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Units *
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.unit_count}
                onChange={(e) => setForm({ ...form, unit_count: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Personnel
              </label>
              <input
                type="number"
                min="1"
                placeholder="Optional"
                value={form.personnel_count}
                onChange={(e) => setForm({ ...form, personnel_count: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Equipment
              </label>
              <input
                type="text"
                placeholder="e.g., Boats, Medical supplies"
                value={form.equipment}
                onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g., 28.6139"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g., 77.2090"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  alert('Click on the map to set coordinates. Close this modal, click on the map, then reopen to add deployment.');
                  onClose();
                }}
                className="w-full py-2.5 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
              >
                📍 Pick Location from Map
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                Or enter coordinates manually above
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Notes
              </label>
              <textarea
                rows="2"
                placeholder="Additional details..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Deploying...
                </>
              ) : (
                'Deploy Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Shelter Modal
export const ShelterModal = ({ initialCoords, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: initialCoords?.latitude?.toFixed(6) || '',
    longitude: initialCoords?.longitude?.toFixed(6) || '',
    capacity: '',
    current_occupancy: 0,
    contact_phone: '',
    contact_person: '',
    facilities: '',
    district: '',
    state: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/map/shelters', data),
    onSuccess: () => {
      toast.success('Shelter added');
      onSuccess();
    },
    onError: (error) => {
      console.error('Shelter error:', error.response?.data);
      toast.error(error.response?.data?.detail || 'Failed to add shelter');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      capacity: parseInt(form.capacity),
      current_occupancy: parseInt(form.current_occupancy),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    };
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center">
              <Home size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Shelter</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Shelter Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Community Relief Center"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Address *
              </label>
              <input
                type="text"
                required
                placeholder="Full address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g., 19.0760"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g., 72.8777"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  alert('Click on the map to set coordinates. Close this modal, click on the map, then reopen to add shelter.');
                  onClose();
                }}
                className="w-full py-2.5 border-2 border-dashed border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 rounded-xl text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-500/10 transition-all"
              >
                📍 Pick Location from Map
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                Or enter coordinates manually above
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Capacity *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="Max capacity"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Contact Phone
              </label>
              <input
                type="tel"
                placeholder="Phone number"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Facilities
              </label>
              <input
                type="text"
                placeholder="e.g., Food, Water, Medical aid"
                value={form.facilities}
                onChange={(e) => setForm({ ...form, facilities: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Shelter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
