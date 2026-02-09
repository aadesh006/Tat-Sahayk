import React from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Popup,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapData } from "../services/storage.js";

const MapPage = () => {
  return (
    <div className="w-full">
      <div className="flex justify-center w-full ">
        <MapContainer
          center={[15.8281, 78.0373]}
          zoom={5}
          minZoom={5}
          className="lg:w-[80%] w-full z-[0]"
          style={{ height: "80vh"  }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            style={{ brightnes: 1.8 }}
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
    </div>
  );
};

export default MapPage;
