import React from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapData } from "../services/storage.js";
import { Activity, Info } from "lucide-react"; 

const MapPage = () => {
  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="bg-white border-b border-blue-100 px-6 py-6 mb-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-red-500 w-2 h-2 rounded-full animate-pulse" />
              <h1 className="text-2xl font-black text-blue-900 tracking-tight uppercase">
                National Incident Map
              </h1>
            </div>
            <p className="text-sm text-blue-500 font-medium">
              Real-time geospatial tracking for emergency response and resource allocation.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-blue-50 border border-blue-100 px-6 py-2 rounded-xl">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Zones</p>
              <p className="text-xl font-black text-blue-900">{MapData.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center w-full ">
        <MapContainer
          center={[15.8281, 78.0373]}
          zoom={5}
          minZoom={5}
          className="lg:w-[80%] w-full z-[0] rounded-2xl shadow-2xl border-4 border-white overflow-hidden"
          style={{ height: "70vh" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            style={{ brightnes: 2.8 }}
          />
          {MapData.map((prop) => (
            <Circle
              key={prop.id} 
              center={prop.position}
              radius={prop.radius}
              pathOptions={{
                color: prop.color,
                fillColor: prop.color,
                fillOpacity: 0.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                {prop.name}
              </Tooltip>
            </Circle>
          ))}
        </MapContainer>
      </div>

      <div className="max-w-[80%] mx-auto mt-6 p-4 bg-white rounded-xl border border-blue-50 flex items-start gap-3">
        <Info className="text-blue-500 shrink-0" size={20} />
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>Note:</strong> Circle radii represent the estimated impact zone.
        </p>
      </div>
    </div>
  );
};

export default MapPage;