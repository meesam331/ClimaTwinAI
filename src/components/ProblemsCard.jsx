import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';

const listMotion = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const itemMotion = { hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } };

export default function ProblemsCard({ problems = [] }) {
  return (
    <motion.article className="glass-card problems-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55, delay: 0.1 }}>
      <div className="card-heading"><div><span className="card-eyebrow danger-eyebrow">EXPOSURE SCAN</span><h2>What’s working against you</h2></div><span className="heading-icon danger-icon"><AlertTriangle size={18} /></span></div>
      <motion.div variants={listMotion} initial="hidden" animate="show" className="problem-list">
        {problems.slice(0, 3).map((problem, index) => (
          <motion.div variants={itemMotion} className="problem-item" key={`${problem}-${index}`}>
            <span className="problem-number">0{index + 1}</span><p>{problem}</p><ArrowUpRight size={16} className="problem-arrow" />
          </motion.div>
        ))}
        {!problems.length && <p className="empty-note">No major exposure signals returned.</p>}
      </motion.div>
      <div className="analysis-note"><span /> Prioritized from your building profile and climate context.</div>
    </motion.article>
  );
}
