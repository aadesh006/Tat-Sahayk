import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../lib/axios';
import { Shield, Home, Plus, X, MapPin, Users, Package, Loader2, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const MapResourcesAdmin = () => {
  const [activeSubTab, setActiveSubTab] = useState('deployments');
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [showShelterModal, setShowShelterModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const queryClient = useQueryClient();

  // Fetch deployments
  const { data: deployments = [], isLoading: loadingDeployments } = useQuery({
    queryKey: ['deployments'],
    queryFn: async () => {
      const res = await axiosInstance.get('/map/deployments');
      return res.data;
    },
  });

  // Fetch shelters
  const { data: shelters = [], isLoading: loadingShelters } = useQuery({
    queryKey: ['shelters'],
    queryFn: async () => {
      const res = await axiosInstance.get('/map/shelters');
      return res.data;
    },
  });

  // Delete deployment
  const deleteDeploymentMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/map/deployments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['deployments']);
      toast.success('Deployment removed');
    },
    onError: () => toast.error('Failed to delete deployment'),
  });

  // Delete shelter
  const deleteShelterMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/map/shelters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['shelters']);
      toast.success('Shelter removed');
    },
    onError: () => toast.error('Failed to delete shelter'),
  });

  return (
    <div className="space-y-4">

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-[rgb(47,51,54)]">
        <button
          onClick={() => setActiveSubTab('deployments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeSubTab === 'deployments'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Shield size={16} />
          Rescue Teams ({deployments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('shelters')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeSubTab === 'shelters'
              ? 'border-green-500 text-green-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Home size={16} />
          Shelters ({shelters.length})
        </button>
      </div>

      {/* Deployments Tab */}
      {activeSubTab === 'deployments' && (
        <div className="space-y-3">
          <button
            onClick={() => { setEditingItem(null); setShowDeploymentModal(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Deploy Rescue Team
          </button>

          {loadingDeployments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : deployments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)]">
              <Shield size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No rescue teams deployed yet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {deployments.map((deployment) => (
                <div key={deployment.id} className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                        <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{deployment.team_name}</h3>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users size={12} />
                            {deployment.unit_count} units
                          </span>
                          {deployment.personnel_count && (
                            <span>• {deployment.personnel_count} personnel</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteDeploymentMutation.mutate(deployment.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                  
                  {deployment.equipment && (
                    <div className="flex items-start gap-2 mb-2 text-xs">
                      <Package size={12} className="text-gray-400 mt-0.5" />
                      <span className="text-gray-600 dark:text-gray-400">{deployment.equipment}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin size={12} />
                    <span>{deployment.latitude.toFixed(4)}, {deployment.longitude.toFixed(4)}</span>
                    <span className={`ml-auto px-2 py-1 rounded-md font-semibold ${
                      deployment.status === 'deployed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                      deployment.status === 'en_route' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                    }`}>
                      {deployment.status?.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shelters Tab */}
      {activeSubTab === 'shelters' && (
        <div className="space-y-3">
          <button
            onClick={() => { setEditingItem(null); setShowShelterModal(true); }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Add Shelter
          </button>

          {loadingShelters ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" size={24} />
            </div>
          ) : shelters.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl border border-gray-200 dark:border-[rgb(47,51,54)]">
              <Home size={32} className="mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No shelters registered yet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {shelters.map((shelter) => (
                <div key={shelter.id} className="bg-white dark:bg-[rgb(22,22,22)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center shrink-0">
                        <Home size={18} className="text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">{shelter.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{shelter.address}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            Capacity: {shelter.current_occupancy}/{shelter.capacity}
                          </span>
                          {shelter.contact_phone && (
                            <span className="text-gray-600 dark:text-gray-400">• {shelter.contact_phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteShelterMutation.mutate(shelter.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <MapPin size={12} />
                    <span>{shelter.latitude.toFixed(4)}, {shelter.longitude.toFixed(4)}</span>
                    <span className={`ml-auto px-2 py-1 rounded-md font-semibold ${
                      shelter.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                      shelter.status === 'full' ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'
                    }`}>
                      {shelter.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showDeploymentModal && (
        <DeploymentModal
          onClose={() => setShowDeploymentModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['deployments']);
            setShowDeploymentModal(false);
          }}
        />
      )}

      {showShelterModal && (
        <ShelterModal
          onClose={() => setShowShelterModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['shelters']);
            setShowShelterModal(false);
          }}
        />
      )}
    </div>
  );
};


// Deployment Modal
const DeploymentModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    report_id: '',
    team_name: '',
    unit_count: 1,
    personnel_count: '',
    equipment: '',
    latitude: '',
    longitude: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: (data) => axiosInstance.post('/map/deployments', data),
    onSuccess: () => {
      toast.success('Rescue team deployed');
      onSuccess();
    },
    onError: () => toast.error('Failed to deploy team'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      report_id: parseInt(form.report_id) || 0,
      unit_count: parseInt(form.unit_count),
      personnel_count: form.personnel_count ? parseInt(form.personnel_count) : null,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    };
    createMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4 flex items-center justify-between">
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
                placeholder="e.g., Boats, Medical supplies, Communication gear"
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
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Notes
              </label>
              <textarea
                rows="3"
                placeholder="Additional deployment details..."
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
const ShelterModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
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
    onError: () => toast.error('Failed to add shelter'),
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-[rgb(47,51,54)] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-6 py-4 flex items-center justify-between">
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
                District
              </label>
              <input
                type="text"
                placeholder="e.g., Mumbai"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                State
              </label>
              <input
                type="text"
                placeholder="e.g., Maharashtra"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
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
                Current Occupancy
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={form.current_occupancy}
                onChange={(e) => setForm({ ...form, current_occupancy: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[rgb(38,38,38)] dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="Name"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
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
                placeholder="e.g., Food, Water, Medical aid, Bedding"
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

export default MapResourcesAdmin;
