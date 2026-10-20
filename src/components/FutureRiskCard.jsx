import { motion } from 'framer-motion';
import { ArrowUpRight, Radio, ThermometerSun } from 'lucide-react';

export default function FutureRiskCard({ risk }) {
  return (
    <motion.article className="glass-card future-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: 0.19 }}>
      <div className="future-glow" />
      <div className="card-heading future-heading"><div><span className="card-eyebrow future-eyebrow"><Radio size={13} /> CLIMATE HORIZON · 2050</span><h2>Design for what’s next.</h2></div><ThermometerSun size={22} /></div>
      <p className="future-risk">{risk}</p>
      <div className="future-bottom"><span><span className="pulse-dot" /> FUTURE RISK SIGNAL</span><ArrowUpRight size={18} /></div>
      <small className="future-disclaimer">Scenario estimate · not a localized climate projection</small>
    </motion.article>
  );
}
