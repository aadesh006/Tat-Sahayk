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
  html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${emoji}</div>`,
  iconSize: [32, 32], iconAnchor: [16, 16], className: ""
});

// ── Cluster verified reports by proximity ─────────────────────────────────────
function clusterReports(reports, radiusKm = 2) {
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

// ── Main Map Page ─────────────────────────────────────────────────────────────
const MapPage = () => {
  const { authUser } = useAuthUser();
  const queryClient  = useQueryClient();
  const isAdmin      = authUser?.role === "admin";

  // UI state
  const [addMode,      setAddMode]      = useState(null);   // null | 'annotation' | 'force'
  const [pendingLatLng, setPending]     = useState(null);
  const [showForcePanel, setForcePanel] = useState(false);
  const [layers,       setLayers]       = useState({
    reports: true, annotations: true, forces: true
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

  // ── Cluster the verified reports ───────────────────────────────────────────
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
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <Toaster />

      {/* ── Top Bar ── */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 flex-wrap shrink-0">
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Activity size={14} className="text-blue-400" /> Live Incident Map
          </h1>
          <p className="text-[10px] text-slate-400">
            {clusters.length} active zones · {mapData?.verified_reports?.length ?? 0} verified reports
          </p>
        </div>

        {/* Layer toggles */}
        <div className="flex gap-2 ml-auto flex-wrap">
          {[
            { key:"reports",     label:"Reports",    color:"bg-blue-500" },
            { key:"annotations", label:"Markers",    color:"bg-green-500" },
            { key:"forces",      label:"Forces",     color:"bg-purple-500" },
          ].map((l) => (
            <button key={l.key}
              onClick={() => setLayers(prev => ({ ...prev, [l.key]: !prev[l.key] }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                ${layers[l.key]
                  ? `${l.color} text-white border-transparent`
                  : "bg-slate-700 text-slate-400 border-slate-600"}`}>
              <span className={`w-2 h-2 rounded-full ${layers[l.key] ? "bg-white" : "bg-slate-500"}`} />
              {l.label}
            </button>
          ))}
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => { setAddMode(addMode === "annotation" ? null : "annotation"); setPending(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${addMode === "annotation" ? "bg-green-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              <MapPin size={13} /> {addMode === "annotation" ? "Click map to place" : "Add Marker"}
            </button>
            <button
              onClick={() => { setAddMode(addMode === "force" ? null : "force"); setPending(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${addMode === "force" ? "bg-purple-500 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
              <Shield size={13} /> {addMode === "force" ? "Click map to place" : "Deploy Force"}
            </button>
            <button
              onClick={() => setForcePanel(!showForcePanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">
              <Users size={13} /> Forces ({forcesAdmin?.length ?? 0})
            </button>
          </div>
        )}
      </div>

      {/* ── Map + Sidebar layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* MAP */}
        <div className="flex-1 relative">
          {addMode && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-xs font-black shadow-lg flex items-center gap-2">
              <Crosshair size={14} className="animate-pulse" />
              Click anywhere on the map to place the {addMode === "annotation" ? "marker" : "force"}
            </div>
          )}

          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={4}
            style={{ height: "100%", width: "100%", background: "#0f172a" }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; CartoDB"
            />

            <MapClickHandler onMapClick={handleMapClick} active={!!addMode} />

            {/* ── Verified report clusters ── */}
            {layers.reports && clusters.map((cluster, idx) => {
              const center   = cluster[0];
              const count    = cluster.length;
              const maxSev   = cluster.find(r => r.severity === "critical")?.severity ||
                               cluster.find(r => r.severity === "high")?.severity ||
                               cluster.find(r => r.severity === "medium")?.severity || "low";
              const color    = SEVERITY_COLOR[maxSev] || "#3b82f6";
              const hazColor = HAZARD_COLOR[center.hazard_type] || "#3b82f6";
              const radius   = Math.min(20 + count * 8, 60); // px size scales with count

              return (
                <CircleMarker
                  key={idx}
                  center={[center.lat, center.lon]}
                  radius={radius}
                  pathOptions={{
                    fillColor: hazColor,
                    fillOpacity: 0.35,
                    color: color,
                    weight: 2,
                  }}
                >
                  <Tooltip permanent direction="center" className="cluster-label">
                    <span style={{ fontWeight:"900", fontSize:"13px", color:"white" }}>
                      {count}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="font-black text-slate-900">{center.hazard_type}</p>
                      <p className="text-xs text-slate-500">{count} verified report{count > 1 ? "s" : ""}</p>
                      <p className="text-xs mt-1 font-semibold" style={{ color }}>
                        Severity: {maxSev.toUpperCase()}
                      </p>
                      <hr className="my-1" />
                      {cluster.slice(0, 3).map((r, i) => (
                        <p key={i} className="text-[11px] text-slate-600 truncate">• {r.description}</p>
                      ))}
                      {count > 3 && <p className="text-[10px] text-slate-400">+{count-3} more</p>}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* ── Admin annotations ── */}
            {layers.annotations && mapData?.annotations?.map((ann) => {
              const cfg = ANNOTATION_CONFIG[ann.type] || ANNOTATION_CONFIG.rescue_center;
              return (
                <React.Fragment key={ann.id}>
                  <Marker
                    position={[ann.lat, ann.lon]}
                    icon={makeIcon(cfg.emoji, cfg.color)}
                  >
                    <Popup>
                      <div className="min-w-[160px]">
                        <p className="font-black text-slate-900">{cfg.emoji} {ann.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{cfg.label}</p>
                        {ann.description && <p className="text-xs text-slate-600 mt-1">{ann.description}</p>}
                        {isAdmin && (
                          <button
                            onClick={() => removeAnnotation(ann.id)}
                            className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={11} /> Remove
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
            {layers.forces && mapData?.deployed_forces?.map((force) => (
              <Marker
                key={force.id}
                position={[force.lat, force.lon]}
                icon={makeIcon("🛡️", FORCE_COLOR[force.force_type] || "#1d4ed8")}
              >
                <Popup>
                  <div className="min-w-[160px]">
                    <p className="font-black text-slate-900">🛡️ {force.unit_name}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: FORCE_COLOR[force.force_type] }}>
                      {force.force_type}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      👥 {force.personnel_count} personnel
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold
                      ${force.status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {force.status.toUpperCase()}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

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
          <div className="w-80 bg-slate-800 border-l border-slate-700 overflow-y-auto flex flex-col">

            {/* Annotation form */}
            {addMode === "annotation" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <MapPin size={14} className="text-green-400" /> Add Map Marker
                  </h3>
                  <button onClick={() => { setAddMode(null); setPending(null); }}
                    className="text-slate-400 hover:text-white"><X size={16} /></button>
                </div>

                {pendingLatLng ? (
                  <div className="px-3 py-2 bg-green-900/30 border border-green-700 rounded-xl">
                    <p className="text-[10px] text-green-400 font-bold">✓ Location pinned</p>
                    <p className="text-xs text-green-300">{pendingLatLng.lat.toFixed(4)}°N, {pendingLatLng.lng.toFixed(4)}°E</p>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700 rounded-xl">
                    <p className="text-[10px] text-yellow-400 font-bold animate-pulse">← Click the map to pin location</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                  <select value={annForm.type} onChange={e => setAnnForm({...annForm, type: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none">
                    {Object.entries(ANNOTATION_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.emoji} {v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                  <input type="text" placeholder="e.g. Marina Beach Rescue Centre"
                    value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                  <textarea rows={2} placeholder="Capacity, contact, instructions..."
                    value={annForm.description} onChange={e => setAnnForm({...annForm, description: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none resize-none" />
                </div>

                {annForm.type === "affected_zone" && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Affected Radius (km)
                    </label>
                    <input type="number" placeholder="e.g. 5"
                      value={annForm.radius_km} onChange={e => setAnnForm({...annForm, radius_km: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none" />
                  </div>
                )}

                <button onClick={handleAnnotationSubmit} disabled={addingAnn || !pendingLatLng}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                  {addingAnn ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  Add to Map
                </button>
              </div>
            )}

            {/* Force deployment form */}
            {addMode === "force" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Shield size={14} className="text-purple-400" /> Deploy Force
                  </h3>
                  <button onClick={() => { setAddMode(null); setPending(null); }}
                    className="text-slate-400 hover:text-white"><X size={16} /></button>
                </div>

                {pendingLatLng ? (
                  <div className="px-3 py-2 bg-purple-900/30 border border-purple-700 rounded-xl">
                    <p className="text-[10px] text-purple-400 font-bold">✓ Deployment location set</p>
                    <p className="text-xs text-purple-300">{pendingLatLng.lat.toFixed(4)}°N, {pendingLatLng.lng.toFixed(4)}°E</p>
                  </div>
                ) : (
                  <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-700 rounded-xl">
                    <p className="text-[10px] text-yellow-400 font-bold animate-pulse">← Click the map to set position</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Name</label>
                  <input type="text" placeholder="e.g. NDRF Team 11"
                    value={forceForm.unit_name} onChange={e => setForceForm({...forceForm, unit_name: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</label>
                    <select value={forceForm.force_type} onChange={e => setForceForm({...forceForm, force_type: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none">
                      {["NDRF","Coast_Guard","Police","Medical","Army"].map(t => (
                        <option key={t} value={t}>{t.replace("_"," ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
                    <select value={forceForm.status} onChange={e => setForceForm({...forceForm, status: e.target.value})}
                      className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none">
                      <option value="active">Active</option>
                      <option value="standby">Standby</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Count</label>
                  <input type="number" min="0"
                    value={forceForm.personnel_count} onChange={e => setForceForm({...forceForm, personnel_count: parseInt(e.target.value)||0})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none" />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipment</label>
                  <input type="text" placeholder="e.g. 2 boats, life jackets, medical kits"
                    value={forceForm.equipment} onChange={e => setForceForm({...forceForm, equipment: e.target.value})}
                    className="mt-1 w-full px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-xl text-sm outline-none" />
                </div>

                <button onClick={handleForceSubmit} disabled={deploying || !pendingLatLng}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                  {deploying ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                  Deploy on Map
                </button>
              </div>
            )}

            {/* Forces overview panel */}
            {showForcePanel && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Users size={14} className="text-blue-400" /> Deployed Forces
                  </h3>
                  <button onClick={() => setForcePanel(false)} className="text-slate-400 hover:text-white">
                    <X size={16} />
                  </button>
                </div>

                {/* Summary by type */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {Object.entries(forceSummary).map(([type, data]) => (
                    <div key={type} className="bg-slate-700 rounded-xl p-3 border border-slate-600">
                      <p className="text-[10px] font-black uppercase text-slate-400">{type.replace("_"," ")}</p>
                      <p className="text-xl font-black text-white">{data.personnel}</p>
                      <p className="text-[10px] text-slate-400">{data.count} unit{data.count > 1 ? "s" : ""}</p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-3 mb-4">
                  <p className="text-[10px] text-blue-400 font-black uppercase">Total Deployed</p>
                  <p className="text-2xl font-black text-white">
                    {(forcesAdmin || []).reduce((s, f) => s + f.personnel_count, 0)} personnel
                  </p>
                  <p className="text-xs text-blue-300">{forcesAdmin?.length ?? 0} active units</p>
                </div>

                {/* Individual units */}
                <div className="space-y-2">
                  {(forcesAdmin || []).map((force) => (
                    <div key={force.id} className="bg-slate-700 border border-slate-600 rounded-xl p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-white">{force.unit_name}</p>
                          <p className="text-[10px]" style={{ color: FORCE_COLOR[force.force_type] }}>
                            {force.force_type.replace("_"," ")} · {force.personnel_count} personnel
                          </p>
                          {force.equipment && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{force.equipment}</p>
                          )}
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold
                            ${force.status === "active" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                            {force.status.toUpperCase()}
                          </span>
                        </div>
                        <button onClick={() => withdrawForce(force.id)}
                          className="text-red-400 hover:text-red-300 p-1">
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

      {/* Cluster label style fix */}
      <style>{`
        .cluster-label { background: transparent !important; border: none !important; box-shadow: none !important; }
        .cluster-label::before { display: none !important; }
      `}</style>
    </div>
  );
};

export default MapPage;