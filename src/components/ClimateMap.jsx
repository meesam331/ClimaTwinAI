import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

const markerIcon = L.divIcon({
  className: 'twin-marker',
  html: renderToStaticMarkup(<span className="twin-marker-pulse"><span /></span>),
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 12, { duration: 1.35 });
  }, [map, position]);
  return null;
}

export default function ClimateMap({ location, city }) {
  const position = [location.latitude, location.longitude];
  return (
    <motion.article className="glass-card map-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: 0.16 }}>
      <div className="card-heading map-heading"><div><span className="card-eyebrow">SITE CONTEXT</span><h2>On the ground</h2></div><span className="map-location"><MapPin size={14} />{city}</span></div>
      <div className="map-frame">
        <MapContainer center={position} zoom={12} scrollWheelZoom={false} zoomControl={false}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyTo position={position} />
          <Marker position={position} icon={markerIcon} />
        </MapContainer>
        <div className="map-coordinates"><span>LAT {Number(location.latitude).toFixed(4)}</span><span>LON {Number(location.longitude).toFixed(4)}</span></div>
      </div>
      <p className="map-caption">{location.display_name}</p>
    </motion.article>
  );
}
