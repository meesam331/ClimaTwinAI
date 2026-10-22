import { motion } from 'framer-motion';
import { Bar, BarChart, ResponsiveContainer } from 'recharts';
import { Droplets, Factory, Sun } from 'lucide-react';

const metrics = [
  { key: 'carbon_kg_per_year', label: 'Annual carbon', unit: 'kg CO₂ / yr', icon: Factory, color: '#bd7257', chart: '#d69472' },
  { key: 'solar_kw', label: 'Solar potential', unit: 'kW capacity', icon: Sun, color: '#ad7a2f', chart: '#d1a654' },
  { key: 'water_litres', label: 'Rain capture', unit: 'litres / yr', icon: Droplets, color: '#4e8790', chart: '#78aeb0' },
];

export default function MetricsCard({ analysis }) {
  return (
    <motion.article className="glass-card metrics-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: 0.06 }}>
      <div className="card-heading"><div><span className="card-eyebrow">BUILDING IMPACT</span><h2>Numbers that matter</h2></div><span className="live-dot">MODELLED</span></div>
      <div className="metric-list">
        {metrics.map(({ key, label, unit, icon: Icon, color, chart }) => {
          const value = Number(analysis[key]) || 0;
          return (
            <div className="metric-row" key={key}>
              <span className="metric-icon" style={{ color, backgroundColor: `${color}15` }}><Icon size={19} /></span>
              <div className="metric-label"><strong>{label}</strong><small>{unit}</small></div>
              <div className="metric-value"><strong>{value.toLocaleString()}</strong></div>
              <div className="metric-chart" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ value: 28 }, { value: 45 }, { value: 35 }, { value: 68 }, { value: 54 }, { value: 85 }]}>
                    <Bar dataKey="value" fill={chart} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
      <p className="metric-footnote">Estimates are early-stage screening metrics, not engineering design values.</p>
    </motion.article>
  );
}
