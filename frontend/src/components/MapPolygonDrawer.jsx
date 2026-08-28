import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

export default function MapPolygonDrawer({ isDrawing, onPolygonCreated, onCancelDrawing }) {
  const map = useMap();
  const drawnItemsRef = useRef(new L.FeatureGroup());
  const drawControlRef = useRef(null);

  useEffect(() => {
    const drawnItems = drawnItemsRef.current;
    map.addLayer(drawnItems);

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: {
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.3,
            weight: 2
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });

    drawControlRef.current = drawControl;

    // Handle polygon creation
    map.on(L.Draw.Event.CREATED, function (event) {
      const layer = event.layer;
      drawnItems.addLayer(layer);

      // Get the coordinates as array of [lat, lng]
      const coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
      
      if (onPolygonCreated) {
        onPolygonCreated(coordinates, layer);
      }
    });

    // Handle polygon edit
    map.on(L.Draw.Event.EDITED, function (event) {
      const layers = event.layers;
      layers.eachLayer(function (layer) {
        const coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
        if (onPolygonCreated) {
          onPolygonCreated(coordinates, layer);
        }
      });
    });

    // Handle polygon delete
    map.on(L.Draw.Event.DELETED, function () {
      if (onCancelDrawing) {
        onCancelDrawing();
      }
    });

    return () => {
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
    };
  }, [map, onPolygonCreated, onCancelDrawing]);

  useEffect(() => {
    if (isDrawing && drawControlRef.current) {
      map.addControl(drawControlRef.current);
    } else if (!isDrawing && drawControlRef.current) {
      map.removeControl(drawControlRef.current);
    }
  }, [isDrawing, map]);

  return null;
}
