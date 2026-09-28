import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INCIDENT_TYPES, URGENCY_COLORS, CAMEROON_CENTER } from '../utils/constants';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createIcon = (color) =>
  L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) onLocationSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function HeatmapLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points?.length) return;

    import('leaflet.heat').then(() => {
      if (layerRef.current) map.removeLayer(layerRef.current);
      const heatData = points.map((p) => [p.lat, p.lng, p.weight || 1]);
      layerRef.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: { 0.2: '#2B6CB0', 0.5: '#D69E2E', 0.8: '#E53E3E', 1: '#C53030' },
      }).addTo(map);
    });

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [points, map]);

  return null;
}

export default function IncidentMap({
  incidents = [],
  center = CAMEROON_CENTER,
  zoom = 13,
  height = '400px',
  onLocationSelect,
  selectedPosition,
  showHeatmap = false,
  heatmapPoints = [],
  interactive = true,
}) {
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border shadow-sm">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} zoom={zoom} />
        {onLocationSelect && <ClickHandler onLocationSelect={onLocationSelect} />}

        {incidents.map((inc) => {
          const coords = inc.location?.coordinates;
          if (!coords) return null;
          const typeInfo = INCIDENT_TYPES[inc.type] || {};
          const color = URGENCY_COLORS[inc.urgency] || typeInfo.color || '#E53E3E';
          return (
            <Marker
              key={inc._id}
              position={[coords[1], coords[0]]}
              icon={createIcon(color)}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-bold">{typeInfo.icon} {typeInfo.label || inc.type}</p>
                  <p className="text-gray-600 mt-1">{inc.description?.substring(0, 100)}</p>
                  <p className="text-xs text-gray-400 mt-1">Urgence: {inc.urgency}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {selectedPosition && (
          <Marker position={selectedPosition} icon={createIcon('#2B6CB0')} />
        )}

        {showHeatmap && <HeatmapLayer points={heatmapPoints} />}
      </MapContainer>
    </div>
  );
}
