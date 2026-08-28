import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { axiosInstance } from '../lib/axios';
import useAuthUser from '../hooks/useAuthUser';
import toast from 'react-hot-toast';

export function HazardZoneModal({ polygonCoords, onClose, onSuccess }) {
  const { authUser } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    district: authUser?.district || '',
    state: authUser?.state || '',
    intensity: 'high',
    hazard_types: '',
    population_at_risk: 0,
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.district || !form.state) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // Calculate center point
      const centerLat = polygonCoords.reduce((sum, coord) => sum + coord[0], 0) / polygonCoords.length;
      const centerLon = polygonCoords.reduce((sum, coord) => sum + coord[1], 0) / polygonCoords.length;

      // Convert to GeoJSON format (expected by backend)
      const boundaryGeoJSON = {
        type: "Polygon",
        coordinates: [[
          ...polygonCoords.map(coord => [coord[1], coord[0]]), // [lng, lat] format for GeoJSON
          [polygonCoords[0][1], polygonCoords[0][0]] // Close the polygon
        ]]
      };

      const hazardTypes = form.hazard_types.split(',').map(t => t.trim()).filter(t => t);

      const payload = {
        name: form.name,
        district: form.district,
        state: form.state,
        intensity: form.intensity,
        hazard_types: hazardTypes.length > 0 ? hazardTypes : ['general'],
        population_at_risk: parseInt(form.population_at_risk) || 0,
        center_lat: centerLat,
        center_lon: centerLon,
        boundary: boundaryGeoJSON,
        affected_area_sqkm: 0.0,
        last_incident_date: null
      };

      console.log('Sending hazard zone payload:', JSON.stringify(payload, null, 2));
      console.log('Request URL:', '/red-zones/hazard-zones/');
      console.log('Full URL:', axiosInstance.defaults.baseURL + '/red-zones/hazard-zones/');

      const response = await axiosInstance.post('/red-zones/hazard-zones/', payload);
      console.log('Success response:', response.data);

      toast.success('Hazard zone created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Full error creating hazard zone:', error);
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      const errorMsg = error.response?.data?.detail 
        || error.response?.data?.message
        || error.message 
        || 'Failed to create hazard zone';
      
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[rgb(22,22,22)] rounded-2xl w-full max-w-2xl border border-gray-200 dark:border-[rgb(47,51,54)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-[rgb(47,51,54)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center border border-red-100 dark:border-red-800">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-white font-semibold text-base">Save Hazard Zone</h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Mark this area as a permanent risk zone</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-[rgb(38,38,38)] rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Zone Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Chamoli Glacier Risk Zone"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                District *
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                disabled={!!authUser?.district}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              {authUser?.district && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-filled from your profile</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
                State *
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                disabled={!!authUser?.state}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              {authUser?.state && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Auto-filled from your profile</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Intensity *
            </label>
            <select
              value={form.intensity}
              onChange={(e) => setForm({ ...form, intensity: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Hazard Types (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. landslide, flood, glacier_lake_outburst"
              value={form.hazard_types}
              onChange={(e) => setForm({ ...form, hazard_types: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Population at Risk
            </label>
            <input
              type="number"
              value={form.population_at_risk}
              onChange={(e) => setForm({ ...form, population_at_risk: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 block">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] dark:bg-[rgb(38,38,38)] dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
              placeholder="Additional details about this hazard zone..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(47,51,54)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[rgb(38,38,38)] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
              Save Hazard Zone
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
