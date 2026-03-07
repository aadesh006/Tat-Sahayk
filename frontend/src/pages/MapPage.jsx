import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { fetchReports } from '../lib/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center] = useState([20.5937, 78.9629]); // Center of India

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await fetchReports({ allReports: true });
      // Filter reports with valid coordinates
      const validReports = data.filter(r => r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0);
      setReports(validReports);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#f59e0b';
      case 'low': return '#84cc16';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {reports.map((report) => (
          <div key={report.id}>
            <Circle
              center={[report.latitude, report.longitude]}
              radius={5000}
              pathOptions={{
                color: getSeverityColor(report.severity),
                fillColor: getSeverityColor(report.severity),
                fillOpacity: 0.2,
              }}
            />
            <Marker position={[report.latitude, report.longitude]}>
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg">{report.hazard_type}</h3>
                  <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                  <div className="flex gap-2 text-xs">
                    <span className={`badge badge-sm ${
                      report.severity === 'critical' ? 'badge-error' :
                      report.severity === 'high' ? 'badge-warning' :
                      report.severity === 'medium' ? 'badge-info' :
                      'badge-success'
                    }`}>
                      {report.severity}
                    </span>
                    <span className={`badge badge-sm ${
                      report.status === 'verified' ? 'badge-success' : 'badge-ghost'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapPage;
