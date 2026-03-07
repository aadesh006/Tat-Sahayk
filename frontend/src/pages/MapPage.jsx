import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle,
  Marker, Popup, useMapEvents, LayerGroup, Tooltip } from 'react-leaflet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { axiosInstance } from '../lib/axios.js';
import useAuthUser from '../hooks/useAuthUser.js';
import { Shield, Users, MapPin, Plus, X, Loader2,
  AlertTriangle, Crosshair, Trash2, Activity } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// ── Color helpers ─────────────────────────────────────────────────────────────
const SEVERITY_COLOR = { critical:"#ef4444", high:"#f97316", medium:"#eab308", low:"#22c55e" };
const HAZARD_COLOR   = { Flood:"#3b82f6", Cyclone:"#ef4444", Storm:"#f97316", Tsunami:"#8b5cf6", "Oil Spill":"#84cc16" };
const FORCE_COLOR    = { NDRF:"#1d4ed8", Coast_Guard:"#0e7490", Police:"#7c3aed", Medical:"#dc2626", Army:"#15803d" };
const ANNOTATION_CONFIG = {
  rescue_center:     { color:"#16a34a", emoji:"🏥", label:"Rescue Center" },
  affected_zone:     { color:"#ef4444", emoji:"⚠️",  label:"Affected Zone" },
  evacuation_route:  { color:"#f59e0b", emoji:"🚗",  label:"Evacuation Route" },
  medical_camp:      { color:"#0891b2", emoji:"💊",  label:"Medical Camp" },
  shelter:           { color:"#7c3aed", emoji:"🏠",  label:"Shelter" },
};

// ── Custom Leaflet Icons ──────────────────────────────────────────────────────
const makeIcon = (emoji, color) => L.divIcon({
  html: `<div style="
    background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    border: 3px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15);
    transition: transform 0.2s;
  ">${emoji}</div>`,
  iconSize: [40, 40], 
  iconAnchor: [20, 20], 
  className: "custom-marker-icon"
});

// ── Cluster verified reports by proximity ─────────────────────────────────────
function clusterReports(reports, radiusKm = 80) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < reports.length; i++) {
    if (assigned.has(i)) continue;
    const group = [reports[i]];
    assigned.add(i);

    for (let j = i + 1; j < reports.length; j++) {
      if (assigned.has(j)) continue;
      const dist = haversine(
        reports[i].lat, reports[i].lon,
        reports[j].lat, reports[j].lon
      );
      if (dist <= radiusKm && reports[j].hazard_type === reports[i].hazard_type) {
        group.push(reports[j]);
        assigned.add(j);
      }
    }
    clusters.push(group);
  }
  return clusters;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Click handler for admin pin-drop ─────────────────────────────────────────
const MapClickHandler = ({ onMapClick, active }) => {
  useMapEvents({ click: (e) => { if (active) onMapClick(e.latlng); }});
  return null;
};

// ── Zoom handler to hide navbar on zoom ──────────────────────────────────────
const ZoomHandler = ({ onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    }
  });
  return null;
};

// ── Main Map Page ─────────────────────────────────────────────────────────────
const MapPage = () => {
  const { authUser } = useAuthUser();
  const queryClient  = useQueryClient();
  const isAdmin      = authUser?.role === "admin";

  // UI state
  const [addMode,      setAddMode]      = useState(null);   // null | 'annotation' | 'force'
  const [pendingLatLng, setPending]     = useState(null);
  const [showForcePanel, setForcePanel] = useState(false);
  const [currentZoom,  setCurrentZoom]  = useState(5);      // Track zoom level
  const [layers,       setLayers]       = useState({
    reports: true, annotations: false, forces: false  // Only reports active by default
  });

  // Form state
  const [annForm,   setAnnForm]   = useState({ type:"rescue_center", title:"", description:"", radius_km:"" });
  const [forceForm, setForceForm] = useState({ unit_name:"", force_type:"NDRF", personnel_count:0, equipment:"", status:"active" });

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: mapData, isLoading } = useQuery({
    queryKey: ["mapData"],
    queryFn:  async () => { const r = await axiosInstance.get("/map/data"); return r.data; },
    refetchInterval: 60000,
  });

  const { data: forcesAdmin } = useQuery({
    queryKey: ["adminForces"],
    queryFn:  async () => { const r = await axiosInstance.get("/map/forces"); return r.data; },
    enabled:  isAdmin,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: addAnnotation, isPending: addingAnn } = useMutation({
    mutationFn: (data) => axiosInstance.post("/map/annotations", data),
    onSuccess: () => {
      toast.success("Annotation added to map");
      queryClient.invalidateQueries({ queryKey: ["mapData"] });
      setPending(null); setAddMode(null);
      setAnnForm({ type:"rescue_center", title:"", description:"", radius_km:"" });
    },
    onError: () => toast.error("Failed to add annotation"),
  });

  const { mutate: removeAnnotation } = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/map/annotations/${id}`),
    onSuccess:  () => { toast.success("Removed"); queryClient.invalidateQueries({ queryKey: ["mapData"] }); },
  });

  const { mutate: deployForce, isPending: deploying } = useMutation({
    mutationFn: (data) => axiosInstance.post("/map/forces", data),
    onSuccess: () => {
      toast.success("Force deployed on map");
      queryClient.invalidateQueries({ queryKey: ["mapData", "adminForces"] });
      setPending(null); setAddMode(null);
      setForceForm({ unit_name:"", force_type:"NDRF", personnel_count:0, equipment:"", status:"active" });
    },
    onError: () => toast.error("Failed to deploy force"),
  });

  const { mutate: withdrawForce } = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/map/forces/${id}`),
    onSuccess:  () => { toast.success("Force withdrawn"); queryClient.invalidateQueries({ queryKey: ["mapData", "adminForces"] }); },
  });

  // ── Cluster the verified reports only ───────────────────────────────────────────
  const clusters = mapData?.verified_reports
    ? clusterReports(mapData.verified_reports)
    : [];

  const handleMapClick = (latlng) => setPending(latlng);

  const handleAnnotationSubmit = () => {
    if (!pendingLatLng || !annForm.title) return toast.error("Click a location on the map first");
    addAnnotation({
      ...annForm,
      latitude:  pendingLatLng.lat,
      longitude: pendingLatLng.lng,
      radius_km: annForm.radius_km ? parseFloat(annForm.radius_km) : null,
    });
  };

  const handleForceSubmit = () => {
    if (!pendingLatLng || !forceForm.unit_name) return toast.error("Click a location on the map first");
    deployForce({
      ...forceForm,
      latitude:  pendingLatLng.lat,
      longitude: pendingLatLng.lng,
    });
  };

  // ── Force summary stats for admin ─────────────────────────────────────────
  const forceSummary = (forcesAdmin || []).reduce((acc, f) => {
    acc[f.force_type] = acc[f.force_type] || { count: 0, personnel: 0 };
    acc[f.force_type].count++;
    acc[f.force_type].personnel += f.personnel_count;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black overflow-hidden">
      {/* ── Top Bar ── Always visible, doesn't hide on zoom */}
      <div className="bg-white dark:bg-[rgb(22,22,22)] border-b border-gray-200 dark:border-[rgb(47,51,54)] px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3 shrink-0 relative z-10 pointer-events-auto">
        <div className="min-w-0">
          <h1 className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 md:gap-2">
            <Activity size={12} className="text-sky-500 shrink-0" /> 
            <span className="truncate">Live Incident Map</span>
          </h1>
          <p className="text-[9px] md:text-[10px] text-gray-400 truncate">
            {clusters.length} zones · {mapData?.verified_reports?.length ?? 0} reports
          </p>
        </div>

        {/* Layer toggles - Responsive */}
        <div className="flex gap-1.5 md:gap-2 ml-auto">
          {[
            { key:"reports",     label:"Reports",    shortLabel:"Rep", color:"bg-sky-500" },
            { key:"annotations", label:"Markers",    shortLabel:"Mar", color:"bg-green-500" },
            { key:"forces",      label:"Forces",     shortLabel:"For", color:"bg-purple-500" },
          ].map((l) => (
            <button key={l.key}
              onClick={() => setLayers(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold border transition-all
                ${layers[l.key]
                  ? `${l.color} text-white border-transparent`
                  : "bg-gray-100 dark:bg-[rgb(38,38,38)] text-gray-400 border-gray-200 dark:border-[rgb(47,51,54)]"}`}>
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${layers[l.key] ? "bg-white" : "bg-gray-400"}`} />
              <span className="hidden sm:inline">{l.label}</span>
              <span className="sm:hidden">{l.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Admin controls - Responsive */}
        {isAdmin && (
          <div className="flex gap-1.5 md:gap-2">
            <button
              onClick={() => { setAddMode(addMode === "annotation" ? null : "annotation"); setPending(null); }}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold transition-all
                ${addMode === "annotation" ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-[rgb(38,38,38)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(47,51,54)]"}`}>
              <MapPin size={11} className="md:w-[13px] md:h-[13px]" /> 
              <span className="hidden md:inline">{addMode === "annotation" ? "Click map" : "Add Marker"}</span>
              <span className="md:hidden">+</span>
            </button>
            <button
              onClick={() => { setAddMode(addMode === "force" ? null : "force"); setPending(null); }}
              className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold transition-all
                ${addMode === "force" ? "bg-purple-500 text-white" : "bg-gray-100 dark:bg-[rgb(38,38,38)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(47,51,54)]"}`}>
              <Shield size={11} className="md:w-[13px] md:h-[13px]" /> 
              <span className="hidden md:inline">{addMode === "force" ? "Click map" : "Deploy"}</span>
              <span className="md:hidden">⚡</span>
            </button>
            <button
              onClick={() => setForcePanel(!showForcePanel)}
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[10px] md:text-xs font-semibold bg-gray-100 dark:bg-[rgb(38,38,38)] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[rgb(47,51,54)] transition-all">
              <Users size={11} className="md:w-[13px] md:h-[13px]" /> 
              <span className="hidden sm:inline">Forces</span>
              <span>({forcesAdmin?.length ?? 0})</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Map + Sidebar layout ── */}
      <div className="flex flex-1 overflow-hidden pointer-events-none">

        {/* MAP */}
        <div className="flex-1 relative pointer-events-auto">
          {addMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2">
              <Crosshair size={14} />
              Click anywhere on the map to place the {addMode === "annotation" ? "marker" : "force"}
            </div>
          )}

          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            minZoom={4}
            maxZoom={12}
            maxBounds={[
              [4.0, 68.0],   // Southwest corner (includes southern tip of India)
              [37.0, 98.0]   // Northeast corner (northern India)
            ]}
            maxBoundsViscosity={1.0}
            style={{ height: "100%", width: "100%", background: "#0f172a", zIndex: 1 }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; CartoDB"
            />

            <MapClickHandler onMapClick={handleMapClick} active={!!addMode} />
            <ZoomHandler onZoomChange={setCurrentZoom} />

            {/* ── Verified report clusters ── */}
            {layers.reports && clusters.map((cluster, idx) => {
              const center   = cluster[0];
              const count    = cluster.length;
              const maxSev   = cluster.find(r => r.severity === "critical")?.severity ||
                               cluster.find(r => r.severity === "high")?.severity ||
                               cluster.find(r => r.severity === "medium")?.severity || "low";
              const color    = SEVERITY_COLOR[maxSev] || "#3b82f6";
              const hazColor = HAZARD_COLOR[center.hazard_type] || "#3b82f6";
              
              // Fixed radius - doesn't change with zoom
              const baseRadius = 20;
              const radius = Math.min(baseRadius + count * 5, 60);

              return (
                <CircleMarker
                  key={idx}
                  center={[center.lat, center.lon]}
                  radius={radius}
                  pathOptions={{
                    fillColor: hazColor,
                    fillOpacity: 0.3,
                    color: color,
                    weight: 3,
                  }}
                >
                  <Tooltip permanent direction="center" className="cluster-label">
                    <div style={{
                      background: 'linear-gradient(135deg, white 0%, #f8fafc 100%)',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '900',
                      fontSize: '16px',
                      color: color,
                      border: `3px solid ${color}`,
                      boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 0 0 2px white, 0 0 20px ${color}40`
                    }}>
                      {count}
                    </div>
                  </Tooltip>
                  <Popup>
                    <div className="min-w-[200px] p-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                        <p className="font-black text-gray-900 dark:text-white text-base">{center.hazard_type}</p>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {count} verified report{count > 1 ? "s" : ""}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ 
                          backgroundColor: `${color}20`, 
                          color: color,
                          border: `1px solid ${color}40`
                        }}>
                          {maxSev.toUpperCase()}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 space-y-1">
                        {cluster.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">{r.description}</p>
                          </div>
                        ))}
                        {count > 3 && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic pl-2.5">
                            +{count-3} more reports
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* ── Admin annotations ── */}
            {layers.annotations && mapData?.annotations?.map((ann) => {
              const cfg = ANNOTATION_CONFIG[ann.type] || ANNOTATION_CONFIG.rescue_center;
              const openInMaps = () => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${ann.lat},${ann.lon}`;
                window.open(url, '_blank');
              };
              
              return (
                <React.Fragment key={ann.id}>
                  <Marker
                    position={[ann.lat, ann.lon]}
                    icon={makeIcon(cfg.emoji, cfg.color)}
                    eventHandlers={{
                      click: openInMaps
                    }}
                  >
                    <Popup>
                      <div className="min-w-[180px] p-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{cfg.emoji}</span>
                          <p className="font-black text-gray-900 dark:text-white">{ann.title}</p>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-2" style={{
                          backgroundColor: `${cfg.color}20`,
                          color: cfg.color
                        }}>
                          {cfg.label}
                        </p>
                        {ann.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                            {ann.description}
                          </p>
                        )}
                        
                        {/* Navigate button */}
                        <button
                          onClick={openInMaps}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          🧭 Navigate Here
                        </button>
                        
                        {isAdmin && (
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="mt-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                          >
                            <Trash2 size={12} /> Remove Marker
                          </button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                  {/* Affected zone radius circle */}
                  {ann.radius_km && (
                    <Circle
                      center={[ann.lat, ann.lon]}
                      radius={ann.radius_km * 1000}
                      pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.08, weight: 2, dashArray: "6,4" }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Deployed forces ── */}
            {layers.forces && mapData?.deployed_forces?.map((force) => {
              const openInMaps = () => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${force.lat},${force.lon}`;
                window.open(url, '_blank');
              };
              
              return (
                <Marker
                  key={force.id}
                  position={[force.lat, force.lon]}
                  icon={makeIcon("🛡️", FORCE_COLOR[force.force_type] || "#1d4ed8")}
                  eventHandlers={{
                    click: openInMaps
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px] p-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield size={18} style={{ color: FORCE_COLOR[force.force_type] }} />
                        <p className="font-black text-gray-900 dark:text-white">{force.unit_name}</p>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-2" style={{ 
                        backgroundColor: `${FORCE_COLOR[force.force_type]}20`,
                        color: FORCE_COLOR[force.force_type] 
                      }}>
                        {force.force_type.replace("_", " ")}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mt-2">
                        <Users size={14} />
                        <span className="font-semibold">{force.personnel_count}</span>
                        <span>units</span>
                      </div>
                      {force.equipment && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed flex items-start gap-1">
                          <Shield size={12} className="mt-0.5 shrink-0" />
                          {force.equipment}
                        </p>
                      )}
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold
                        ${force.status === "active" 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"}`}>
                        {force.status.toUpperCase()}
                      </span>
                      
                      {/* Navigate button */}
                      <button
                        onClick={openInMaps}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        <MapPin size={14} /> Navigate to Force
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Pending placement marker */}
            {pendingLatLng && (
              <Marker
                position={[pendingLatLng.lat, pendingLatLng.lng]}
                icon={makeIcon("📍", "#f59e0b")}
              />
            )}
          </MapContainer>
        </div>

        {/* ── Admin Right Panel ── */}
        {isAdmin && (addMode || showForcePanel) && (
          <div className="w-80 bg-white dark:bg-[rgb(22,22,22)] border-l border-gray-200 dark:border-[rgb(47,51,54)] overflow-y-auto flex flex-col pointer-events-auto">

            {/* Annotation form */}
            {addMode === "annotation" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={14} className="text-green-400" /> Add Map Marker
                  </h3>
                  <button onClick={() => { setAddMode(null); setPending(null); }}
                    className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={16} /></button>
                </div>

                {pendingLatLng ? (
                  <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">✓ Location pinned</p>
                    <p className="text-xs text-green-700 dark:text-green-300">{pendingLatLng.lat.toFixed(4)}°N, {pendingLatLng.lng.toFixed(4)}°E</p>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">← Click the map to pin location</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Type</label>
                  <select value={annForm.type} onChange={e => setAnnForm({...annForm, type: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none">
                    {Object.entries(ANNOTATION_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Title</label>
                  <input type="text" placeholder="e.g. Marina Beach Rescue Centre"
                    value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Description</label>
                  <textarea rows={2} placeholder="Capacity, contact, instructions..."
                    value={annForm.description} onChange={e => setAnnForm({...annForm, description: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none resize-none" />
                </div>

                {annForm.type === "affected_zone" && (
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                      Affected Radius (km)
                    </label>
                    <input type="number" placeholder="e.g. 5"
                      value={annForm.radius_km} onChange={e => setAnnForm({...annForm, radius_km: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none" />
                  </div>
                )}

                <button onClick={handleAnnotationSubmit} disabled={addingAnn || !pendingLatLng}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                  {addingAnn ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add to Map
                </button>
              </div>
            )}

            {/* Force deployment form */}
            {addMode === "force" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield size={14} className="text-purple-400" /> Deploy Force
                  </h3>
                  <button onClick={() => { setAddMode(null); setPending(null); }}
                    className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={16} /></button>
                </div>

                {pendingLatLng ? (
                  <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">✓ Deployment location set</p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">{pendingLatLng.lat.toFixed(4)}°N, {pendingLatLng.lng.toFixed(4)}°E</p>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
                    <p className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">← Click the map to set deployment location</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Unit Name</label>
                  <input type="text" placeholder="e.g. NDRF Team 11"
                    value={forceForm.unit_name} onChange={e => setForceForm({...forceForm, unit_name: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Type</label>
                    <select value={forceForm.force_type} onChange={e => setForceForm({...forceForm, force_type: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none">
                      {["NDRF","Coast_Guard","Police","Medical","Army"].map(t => (
                        <option key={t} value={t}>{t.replace("_"," ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Status</label>
                    <select value={forceForm.status} onChange={e => setForceForm({...forceForm, status: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none">
                      <option value="active">Active</option>
                      <option value="standby">Standby</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Personnel Count</label>
                  <input type="number" min="0"
                    value={forceForm.personnel_count} onChange={e => setForceForm({...forceForm, personnel_count: parseInt(e.target.value)||0})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Equipment</label>
                  <input type="text" placeholder="e.g. 2 boats, life jackets, medical kits"
                    value={forceForm.equipment} onChange={e => setForceForm({...forceForm, equipment: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-gray-50 dark:bg-[rgb(38,38,38)] text-gray-900 dark:text-white border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl text-sm outline-none" />
                </div>

                <button onClick={handleForceSubmit} disabled={deploying || !pendingLatLng}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                  {deploying ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                  Deploy on Map
                </button>
              </div>
            )}

            {/* Forces overview panel */}
            {showForcePanel && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users size={14} className="text-sky-500" /> Deployed Forces
                  </h3>
                  <button onClick={() => setForcePanel(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                {/* Summary by type */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(forceSummary).map(([type, data]) => (
                    <div key={type} className="bg-gray-50 dark:bg-[rgb(38,38,38)] rounded-xl p-3 border border-gray-200 dark:border-[rgb(47,51,54)]">
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{type.replace("_"," ")}</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-white">{data.count}</p>
                      <p className="text-[10px] text-gray-400">{data.count} unit{data.count > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Total Deployed</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {forcesAdmin?.length ?? 0} units
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{(forcesAdmin || []).reduce((s, f) => s + f.personnel_count, 0)} personnel</p>
                </div>

                {/* Individual units */}
                <div className="space-y-2">
                  {(forcesAdmin || []).map((force) => (
                    <div key={force.id} className="bg-gray-50 dark:bg-[rgb(38,38,38)] border border-gray-200 dark:border-[rgb(47,51,54)] rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{force.unit_name}</p>
                          <p className="text-[10px]" style={{ color: FORCE_COLOR[force.force_type] }}>
                            {force.force_type.replace("_"," ")} · {force.personnel_count} units
                          </p>
                          {force.equipment && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{force.equipment}</p>
                          )}
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold
                            ${force.status === "active" ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"}`}>
                            {force.status.toUpperCase()}
                          </span>
                        </div>
                        <button onClick={() => withdrawForce(force.id)}
                          className="text-red-400 hover:text-red-500 p-1">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cluster label style fix + Custom popup styling */}
      <style>{`
        .cluster-label { 
          background: transparent !important; 
          border: none !important; 
          box-shadow: none !important; 
        }
        .cluster-label::before { 
          display: none !important; 
        }
        
        /* Marker hover effect */
        .custom-marker-icon:hover {
          transform: scale(1.1);
          z-index: 1000 !important;
        }
        
        /* Modern popup styling */
        .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 12px;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .dark .leaflet-popup-content-wrapper {
          background: rgb(22, 22, 22);
          border-color: rgb(47, 51, 54);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }
        
        .leaflet-popup-content {
          margin: 0;
          font-family: inherit;
        }
        
        .leaflet-popup-tip {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .dark .leaflet-popup-tip {
          background: rgb(22, 22, 22);
          border-color: rgb(47, 51, 54);
        }
        
        .leaflet-popup-close-button {
          color: #9ca3af !important;
          font-size: 22px !important;
          padding: 6px 10px !important;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .leaflet-popup-close-button:hover {
          background: rgba(0, 0, 0, 0.05) !important;
          color: #374151 !important;
        }
        
        .dark .leaflet-popup-close-button:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #d1d5db !important;
        }
      `}</style>
    </div>
  );
};

export default MapPage;