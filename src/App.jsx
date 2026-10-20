import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { ArrowDown, ArrowRight, Check, ChevronDown, CloudSun, Download, LoaderCircle, MapPin, Share2, ShieldCheck, Wind, Zap } from 'lucide-react';

const ScoreCard = lazy(() => import('./components/ScoreCard.jsx'));
const MetricsCard = lazy(() => import('./components/MetricsCard.jsx'));
const ProblemsCard = lazy(() => import('./components/ProblemsCard.jsx'));
const FixesCard = lazy(() => import('./components/FixesCard.jsx'));
const ClimateMap = lazy(() => import('./components/ClimateMap.jsx'));
const FutureRiskCard = lazy(() => import('./components/FutureRiskCard.jsx'));

const initialForm = {
  city: 'Islamabad',
  rooms: 8,
  floors: 2,
  trees: 4,
  occupants: 5,
  area: 2500,
  material: 'Brick',
  roof: 'Concrete',
  orientation: 'South',
  cooling: 'Split AC',
  insulation: 'Basic',
};

const pakistanCities = [
  'Islamabad', 'Karachi', 'Lahore', 'Rawalpindi', 'Faisalabad', 'Peshawar',
  'Quetta', 'Multan', 'Hyderabad', 'Sukkur', 'Khairpur', 'Larkana',
  'Nawabshah', 'Mirpur Khas', 'Bahawalpur', 'Rahim Yar Khan', 'Dera Ghazi Khan',
  'Gujranwala', 'Sialkot', 'Sargodha', 'Sheikhupura', 'Kasur', 'Okara',
  'Abbottabad', 'Mardan', 'Swat', 'Gilgit', 'Skardu', 'Muzaffarabad',
  'Gwadar', 'Turbat', 'Thatta', 'Jhelum', 'Wah Cantt', 'Taxila', 'Chitral',
];

function TypewriterHeadline() {
  const phrase = 'Build Today, Survive 2050';
  const [text, setText] = useState('');
  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setText(phrase.slice(0, index));
      if (index >= phrase.length) window.clearInterval(timer);
    }, 62);
    return () => window.clearInterval(timer);
  }, []);
  return <>{text}<span className="type-caret" aria-hidden="true" /></>;
}

function LoadingOverlay() {
  const messages = ['Reading the local climate signal', 'Pairing NASA Earth observations', 'Modeling your building twin'];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((current) => (current + 1) % messages.length), 1400);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <motion.div className="loading-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="loading-orbit"><span /><span /><span /><CloudSun size={30} /></div>
      <LoaderCircle className="loading-spin" size={18} />
      <strong>Building your climate twin</strong><span>{messages[step]}…</span>
    </motion.div>
  );
}

export default function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: ['rooms', 'floors', 'trees', 'occupants', 'area'].includes(name)
        ? Number(value)
        : value,
    }));
  }

  async function runAnalysis(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Climate analysis could not be completed.');
      setResult(data);
      if (data.analysis.climate_score >= 80) {
        confetti({ particleCount: 110, spread: 68, origin: { y: 0.7 }, colors: ['#4caf50', '#b7f28b', '#e3bf69'] });
      }
      window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (requestError) {
      setError(requestError.message || 'Climate analysis failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function shareResult() {
    const shareData = { title: 'My ClimaTwin AI report', text: `My ${form.city} building climate score is ${result.analysis.climate_score}/100 — ${result.analysis.leed_level}.` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(`${shareData.text}\n${window.location.href}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      }
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setError('Could not share this result from your browser.');
    }
  }

  async function downloadReport() {
    const { analysis, building, nasa } = result;
    let jsPDF;
    try {
      ({ jsPDF } = await import('jspdf'));
    } catch {
      setError('The PDF exporter could not be loaded. Please refresh and try again.');
      return;
    }
    const pdf = new jsPDF();
    pdf.setFillColor(7, 14, 10);
    pdf.rect(0, 0, 210, 297, 'F');
    pdf.setTextColor(238, 245, 237);
    pdf.setFontSize(22);
    pdf.text('ClimaTwin AI', 18, 22);
    pdf.setFontSize(10);
    pdf.setTextColor(133, 171, 145);
    pdf.text('PAKISTAN BUILDING CLIMATE DIGITAL TWIN', 18, 30);
    pdf.setDrawColor(46, 125, 50);
    pdf.line(18, 37, 192, 37);
    pdf.setTextColor(238, 245, 237);
    pdf.setFontSize(14);
    pdf.text(`${building.city} · ${building.area.toLocaleString()} sq ft`, 18, 51);
    pdf.setFontSize(38);
    pdf.text(`${analysis.climate_score}`, 18, 72);
    pdf.setFontSize(12);
    pdf.text(`/ 100   ${analysis.leed_level}`, 45, 70);
    pdf.setFontSize(11);
    const lines = [
      `Building: ${building.rooms} rooms · ${building.floors} floors · ${building.occupants} daily occupants · ${building.trees} trees`,
      `Material: ${building.material} · Roof: ${building.roof} · Facade: ${building.orientation}`,
      `Cooling: ${building.cooling} · Insulation: ${building.insulation}`,
      `Annual carbon: ${analysis.carbon_kg_per_year.toLocaleString()} kg CO2`,
      `Solar potential: ${analysis.solar_kw} kW`,
      `Rain capture: ${analysis.water_litres.toLocaleString()} litres/year`,
      `NASA solar irradiance: ${nasa.solar_radiation ?? 'Not available'}`,
      '',
      'PRIORITY EXPOSURES',
      ...analysis.top_3_problems.map((problem, index) => `${index + 1}. ${problem}`),
      '',
      'RECOMMENDED ACTIONS',
      ...analysis.top_3_fixes.map((fix, index) => `${index + 1}. ${fix.fix} — ${fix.score_gain} · ${fix.saving}`),
      '',
      '2050 RISK OUTLOOK',
      analysis.risk_2050,
      '',
      'Screening estimates only; not a substitute for engineering design or a formal LEED assessment.',
    ];
    pdf.text(pdf.splitTextToSize(lines.join('\n'), 174), 18, 87);
    pdf.save(`climatwin-${building.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
  }

  const analysis = result?.analysis;

  return (
    <div className="app-shell">
      <motion.div className="ambient ambient-one" animate={{ x: [0, 35, 0], y: [0, 28, 0], opacity: [0.13, 0.24, 0.13] }} transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="ambient ambient-two" animate={{ x: [0, -28, 0], y: [0, -35, 0], opacity: [0.08, 0.17, 0.08] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
      <header className="top-nav">
        <a className="brand" href="#top" aria-label="ClimaTwin AI home"><span className="brand-mark"><Wind size={19} /></span><span>clima<span>twin</span><small>AI · PAKISTAN</small></span></a>
        <nav className="nav-links"><a href="#how-it-works">The method</a><a href="#about-data">Data sources</a><a href="#analyze" className="nav-cta">Launch your twin <ArrowRight size={15} /></a></nav>
        <a className="mobile-cta" href="#analyze"><ArrowDown size={17} /></a>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <motion.div className="eyebrow-pill" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><span className="pulse-dot" /> PAKISTAN’S BUILDING CLIMATE TWIN</motion.div>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.12 }}><TypewriterHeadline /></motion.h1>
            <motion.p className="hero-description" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.35 }}>A clearer picture of your building’s climate future. Turn real Earth observations and your design choices into a practical resilience plan.</motion.p>
            <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.48 }}><a className="button-primary" href="#analyze">Build your twin <ArrowRight size={17} /></a><span className="keyless-note"><ShieldCheck size={16} /> No account · no weather API key</span></motion.div>
            <motion.div className="hero-trust" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.75 }}><span><CloudSun size={15} /> Live local conditions</span><i /><span><Zap size={15} /> NASA POWER data</span><i /><span><MapPin size={15} /> Built for Pakistan</span></motion.div>
          </div>
          <motion.div className="hero-visual" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.25 }}>
            <div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" />
            <div className="twin-planet"><div className="planet-grid" /><div className="planet-land land-a" /><div className="planet-land land-b" /><div className="planet-cloud cloud-a" /><div className="planet-cloud cloud-b" /><div className="planet-pin"><MapPin size={17} /></div><span className="planet-glow" /></div>
            <div className="orbit-label label-earth"><span className="status-dot" /> EARTH DATA <b>LIVE</b></div>
            <div className="orbit-label label-twin"><span className="twin-mini"><Wind size={13} /></span> DIGITAL TWIN <b>READY</b></div>
            <div className="orbit-caption">A living model of the<br />place you’re planning.</div>
          </motion.div>
          <a href="#analyze" className="scroll-hint"><span /> Scroll to explore</a>
        </section>

        <section className="source-strip" id="about-data">
          <div><span className="source-symbol nasa-mark">N</span><span><b>NASA POWER</b><small>Earth observations</small></span></div>
          <i />
          <div><span className="source-symbol meteo-mark"><CloudSun size={19} /></span><span><b>OPEN-METEO</b><small>Keyless local weather</small></span></div>
          <i />
          <div><span className="source-symbol map-mark"><MapPin size={19} /></span><span><b>OPENSTREETMAP</b><small>Community mapping</small></span></div>
          <span className="source-strip-note">Open data. Local context. Actionable design.</span>
        </section>

        <section className="analyzer-section" id="analyze">
          <div className="section-intro">
            <div><span className="section-kicker">YOUR BUILDING, REIMAGINED</span><h2>Start with the structure.<br /><em>See the climate story.</em></h2></div>
            <p>Share a few project details. Your twin combines them with local weather and NASA climate signals to surface your next best move.</p>
          </div>
          <motion.form className="input-panel" onSubmit={runAnalysis} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} whileHover={{ borderColor: 'rgba(133, 220, 140, .38)' }} transition={{ duration: 0.55 }}>
            <div className="input-panel-top"><div><span className="step-label">01 <i /> BUILDING PROFILE</span><h3>Tell us what you’re building</h3></div><span className="private-note"><ShieldCheck size={14} /> Not stored · used for this analysis only</span></div>
            <div className="form-grid">
              <label className="field-wrap city-field"><span>PROJECT CITY</span><div className="input-with-icon"><MapPin size={17} /><input name="city" list="pakistan-cities" value={form.city} onChange={update} placeholder="e.g. Karachi, Khairpur" required maxLength="100" autoComplete="address-level2" /><ChevronDown size={15} /></div><datalist id="pakistan-cities">{pakistanCities.map((city) => <option key={city} value={city} />)}</datalist></label>
              <label className="field-wrap"><span>FLOOR AREA</span><div className="input-with-unit"><input name="area" type="number" min="1" max="10000000" value={form.area} onChange={update} required /><b>sq ft</b></div></label>
              <label className="field-wrap"><span>ROOMS</span><input name="rooms" type="number" min="0" value={form.rooms} onChange={update} required /></label>
              <label className="field-wrap"><span>FLOORS</span><input name="floors" type="number" min="1" value={form.floors} onChange={update} required /></label>
              <label className="field-wrap"><span>TREES ON SITE</span><input name="trees" type="number" min="0" value={form.trees} onChange={update} required /></label>
              <label className="field-wrap"><span>DAILY OCCUPANTS</span><input name="occupants" type="number" min="0" max="1000" value={form.occupants} onChange={update} required /></label>
              <label className="field-wrap"><span>PRIMARY MATERIAL</span><select name="material" value={form.material} onChange={update}><option>Brick</option><option>Concrete</option><option>Mud</option></select></label>
              <label className="field-wrap"><span>ROOF TYPE</span><select name="roof" value={form.roof} onChange={update}><option>Concrete</option><option>Metal</option><option>Green roof</option><option>Reflective</option></select></label>
              <label className="field-wrap"><span>MAIN FACADE FACES</span><select name="orientation" value={form.orientation} onChange={update}><option>North</option><option>East</option><option>South</option><option>West</option></select></label>
              <label className="field-wrap"><span>COOLING SYSTEM</span><select name="cooling" value={form.cooling} onChange={update}><option>None</option><option>Fans</option><option>Split AC</option><option>Central AC</option></select></label>
              <label className="field-wrap"><span>INSULATION LEVEL</span><select name="insulation" value={form.insulation} onChange={update}><option>None</option><option>Basic</option><option>Good</option><option>High performance</option></select></label>
              <div className="submit-wrap"><button type="submit" className="button-primary submit-button" disabled={loading}>{loading ? <><LoaderCircle className="loading-spin" size={17} /> Modeling your twin</> : <>Run climate analysis <ArrowRight size={17} /></>}</button><small>Usually takes 10–20 seconds</small></div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </motion.form>
        </section>

        <AnimatePresence>{loading && <LoadingOverlay key="loading" />}</AnimatePresence>

        {analysis && (
          <motion.section id="results" className="results-section" initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}>
            <div className="results-heading"><div><span className="section-kicker">TWIN GENERATED · {result.building.city.toUpperCase()}</span><h2>Your climate intelligence.</h2><p>{result.ai_source === 'demo_fallback' ? `Demo insight set · Groq unavailable (${result.ai_error || 'unknown error'}). Live climate data below.` : 'A site-specific snapshot for the choices you can make today.'}</p></div><div className="result-actions"><button onClick={shareResult} className="action-button"><Share2 size={16} />{copied ? 'Copied' : 'Share'}</button><button onClick={downloadReport} className="action-button action-download"><Download size={16} /> Download PDF</button></div></div>
            <Suspense fallback={<div className="glass-card result-loading"><LoaderCircle className="loading-spin" size={20} /> Preparing your climate insights…</div>}>
              <div className="results-grid">
                <ScoreCard score={analysis.climate_score} leedLevel={analysis.leed_level} />
                <MetricsCard analysis={analysis} />
                <ProblemsCard problems={analysis.top_3_problems} />
                <FixesCard fixes={analysis.top_3_fixes} />
                <ClimateMap location={result.location} city={result.building.city} />
                <FutureRiskCard risk={analysis.risk_2050} />
              </div>
            </Suspense>
            <div className="weather-context"><div className="weather-symbol"><CloudSun size={19} /></div><div><b>Local conditions are part of the model</b><span>{result.weather.current?.temperature_2m ?? '—'}°C · {result.weather.current?.relative_humidity_2m ?? '—'}% humidity · NASA radiation average {result.nasa.solar_radiation ?? 'n/a'} kWh/m²/day · NASA precipitation {result.nasa.rainfall ?? 'n/a'} mm/day</span></div><span className="context-source">OPEN DATA SIGNAL</span></div>
            <p className="method-disclaimer">ClimaTwin is an early-stage screening tool, not an engineering energy model or formal LEED assessment. Validate estimates with a qualified local professional before construction.</p>
          </motion.section>
        )}

        <section className="method-section" id="how-it-works">
          <div className="method-title"><span className="section-kicker">FROM DATA TO DESIGN</span><h2>A twin that starts<br />with <em>the real world.</em></h2></div>
          <div className="method-steps"><article><span>01</span><h3>Ground the location</h3><p>Keyless Open-Meteo conditions and a precise site pin set the local context.</p></article><article><span>02</span><h3>Read the planet</h3><p>NASA POWER monthly observations add solar, rainfall, and temperature signals.</p></article><article><span>03</span><h3>Model better choices</h3><p>AI translates building inputs into a score, risk outlook, and prioritized fixes.</p></article></div>
        </section>
      </main>

      <footer className="site-footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Wind size={17} /></span><span>clima<span>twin</span><small>AI · PAKISTAN</small></span></a><span>Built for a more climate-ready Pakistan.</span><span>Open data, interpreted responsibly.</span></footer>
      <AnimatePresence>{result && <motion.div className="toast-message" initial={{ opacity: 0, y: 12 }} animate={{ opacity: copied ? 1 : 0, y: copied ? 0 : 12 }}><Check size={15} /> Report link copied</motion.div>}</AnimatePresence>
    </div>
  );
}
