import { motion } from 'framer-motion';
import { ArrowUpRight, BadgeCheck, Leaf } from 'lucide-react';

export default function FixesCard({ fixes = [] }) {
  return (
    <motion.article className="glass-card fixes-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: 0.13 }}>
      <div className="card-heading"><div><span className="card-eyebrow success-eyebrow">AI MITIGATION PLAN</span><h2>Moves with measurable upside</h2></div><span className="heading-icon success-icon"><Leaf size={18} /></span></div>
      <div className="fix-list">
        {fixes.slice(0, 3).map((item, index) => (
          <motion.div whileHover={{ scale: 1.015, x: 3 }} className="fix-item" key={`${item.fix}-${index}`}>
            <div className="fix-index">{String(index + 1).padStart(2, '0')}</div>
            <div className="fix-main"><strong>{item.fix}</strong><span><BadgeCheck size={14} /> Score gain {item.score_gain}</span></div>
            <div className="fix-saving"><small>EST. SAVING</small><b>{item.saving}</b></div>
            <ArrowUpRight size={16} className="fix-arrow" />
          </motion.div>
        ))}
        {!fixes.length && <p className="empty-note">Run a climate twin to generate mitigation actions.</p>}
      </div>
    </motion.article>
  );
}
