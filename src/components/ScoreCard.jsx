import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Award, Sparkles } from 'lucide-react';

const levels = ['Uncertified', 'Certified', 'Silver', 'Gold', 'Platinum'];

export default function ScoreCard({ score = 0, leedLevel = 'Uncertified' }) {
  const [count, setCount] = useState(0);
  const levelIndex = Math.max(0, levels.indexOf(leedLevel));

  useEffect(() => {
    let frame;
    const started = performance.now();
    const animate = (now) => {
      const progress = Math.min(1, (now - started) / 1200);
      setCount(Math.round(score * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <motion.article className="glass-card score-card" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.55 }}>
      <div className="card-eyebrow"><Sparkles size={15} /> TWIN RESILIENCE INDEX</div>
      <div className="score-content">
        <div className="score-ring" style={{ '--score': `${score}%` }}>
          <div className="score-ring-inner"><strong>{count}</strong><span>out of 100</span></div>
        </div>
        <div className="score-copy">
          <span className="muted-label">CLIMATE READINESS</span>
          <h2>{score >= 80 ? 'Built for resilience.' : score >= 60 ? 'A strong foundation.' : 'Room to get resilient.'}</h2>
          <p>AI-scored against site conditions, building choices, and NASA Earth observations.</p>
          <div className={`leed-badge leed-${leedLevel.toLowerCase()}`}><Award size={17} /> LEED-inspired <b>{leedLevel}</b></div>
        </div>
      </div>
      <div className="score-scale" aria-label={`LEED-inspired level ${leedLevel}`}>
        {levels.map((level, index) => <span className={index <= levelIndex ? 'is-lit' : ''} key={level} />)}
      </div>
    </motion.article>
  );
}
