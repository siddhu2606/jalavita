import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } }
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const bentoItem = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

export default function LandingPage() {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      if (!barsRef.current) return
      const bars = barsRef.current.children
      for (let i = 0; i < bars.length; i++) {
        const el = bars[i] as HTMLElement
        el.style.height = `${Math.max(10, Math.min(100, Math.random() * 90 + 10))}%`
      }
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/10 backdrop-blur-xl h-16 flex items-center">
          <div className="flex w-full items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--bio)]" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
              <span className="font-bold text-[18px] tracking-wide text-white">JALAVITA<span className="text-[var(--bio)]">.</span></span>
            </div>
          <nav className="hidden md:flex items-center gap-8">
            {['Sensors', 'Networks', 'Analytics', 'Archive'].map(name => (
              <Link key={name} to={`/${name.toLowerCase()}`} className="text-on-surface-variant hover:text-tertiary transition-colors text-body-md">
                {name}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/command" className="hidden sm:block text-on-surface-variant hover:text-tertiary transition-colors text-body-md font-medium">Sign In</Link>
            <Link to="/command" className="bg-secondary-container text-white px-6 py-2 rounded font-bold text-body-md hover:bg-secondary-container/90 transition-colors glow-orange">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden grid-bg pt-16 pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,20,22,0.5)_40%,rgba(15,20,22,1)_80%)]" />

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8"
          >
            {/* Left Column: Text & CTAs */}
            <div className="flex-1 flex flex-col items-start text-left gap-8 lg:max-w-2xl">
              {/* Status chip */}
              <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel border-tertiary/30 text-tertiary text-label-caps">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                SYSTEM ONLINE: GLOBAL ARRAY ACTIVE
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={item} className="text-5xl md:text-6xl lg:text-[72px] lg:leading-[80px] font-extrabold tracking-tighter">
                Ocean Intelligence.
                <br />
                <span className="text-tertiary">Multi-Agent Precision.</span>
              </motion.h1>

              {/* Increased size sentence */}
              <motion.p variants={item} className="text-xl md:text-2xl text-on-surface-variant font-medium leading-relaxed max-w-xl">
                Command the seas with real-time spatiotemporal analytics, multi-agent orchestration, and predictive marine tactical intelligence. Engineered for mission-critical command centers.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
                <Link to="/command" className="bg-secondary-container text-white h-12 px-8 rounded font-bold text-body-md flex items-center justify-center gap-2 hover:bg-secondary-container/90 transition-all glow-orange active:scale-95">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                  Initiate Operations
                </Link>
                <Link to="/command" className="bg-transparent text-tertiary border border-tertiary h-12 px-8 rounded font-bold text-body-md flex items-center justify-center gap-2 hover:bg-tertiary/10 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                  Operator Login
                </Link>
              </motion.div>

              {/* Micro-stats */}
              <motion.div variants={item} className="flex flex-wrap items-start justify-start gap-10 border-t border-white/10 pt-8 mt-4 w-full">
                <div className="text-left">
                  <div className="text-mono-data text-tertiary">LATENCY</div>
                  <div className="text-headline-md font-bold">&lt; 12ms</div>
                </div>
                <div className="text-left">
                  <div className="text-mono-data text-tertiary">ACTIVE NODES</div>
                  <div className="text-headline-md font-bold">14,208</div>
                </div>
                <div className="text-left">
                  <div className="text-mono-data text-tertiary">STATUS</div>
                  <div className="text-headline-md font-bold text-tertiary flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    NOMINAL
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Radar (Smaller) */}
            <motion.div variants={item} className="flex-1 w-full flex justify-center lg:justify-end">
              <div className="w-full max-w-[400px] lg:max-w-[480px] aspect-square relative glass-panel rounded-xl flex items-center justify-center overflow-hidden">
                <div className="absolute w-[90%] h-[90%] border border-tertiary/20 rounded-full" />
                <div className="absolute w-[60%] h-[60%] border border-tertiary/30 rounded-full" />
                <div className="absolute w-[30%] h-[30%] border border-tertiary/40 rounded-full" />
                <div className="absolute w-full h-[1px] bg-tertiary/20" />
                <div className="absolute h-full w-[1px] bg-tertiary/20" />
                <div className="absolute inset-0 radar-sweep" style={{ top: '50%', left: '50%', transformOrigin: 'center center' }} />
                <div className="absolute w-3 h-3 bg-tertiary rounded-full top-[30%] left-[40%] shadow-[0_0_10px_#7bd0ff]" />
                <div className="absolute w-2 h-2 bg-secondary-container rounded-full top-[60%] left-[70%] shadow-[0_0_8px_#FF6500]" />
                <div className="absolute w-2 h-2 bg-tertiary rounded-full top-[20%] left-[75%] shadow-[0_0_8px_#7bd0ff] opacity-50" />
                <div className="absolute w-4 h-4 bg-error rounded-full top-[75%] left-[25%] shadow-[0_0_12px_#ffb4ab] flex items-center justify-center">
                  <span className="absolute w-full h-full border border-error rounded-full animate-ping" />
                </div>
                <svg className="absolute inset-0 w-full h-full opacity-30">
                  <line x1="40%" y1="30%" x2="70%" y2="60%" stroke="#7bd0ff" strokeDasharray="4" strokeWidth="1" />
                  <line x1="40%" y1="30%" x2="25%" y2="75%" stroke="#7bd0ff" strokeDasharray="4" strokeWidth="1" />
                  <line x1="75%" y1="20%" x2="40%" y2="30%" stroke="#7bd0ff" strokeDasharray="4" strokeWidth="1" />
                </svg>
                <div className="absolute top-4 left-4 text-[10px] font-mono text-tertiary">SECTOR: 7G-ALPHA</div>
                <div className="absolute bottom-4 right-4 text-[10px] font-mono text-tertiary">SCAN RATE: MAX</div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Operational Domains */}
        <section className="w-full bg-surface py-24 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16 max-w-3xl">
              <h2 className="text-headline-lg font-bold flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-tertiary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>dns</span>
                Operational Domains
              </h2>
              <p className="text-body-lg text-on-surface-variant">
                Our integrated tactical stack delivers unprecedented visibility across four core vectors, enabling decisive action in high-stakes marine environments.
              </p>
            </motion.div>

            <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 auto-rows-[280px]">
              {/* Sensors (8 cols) */}
              <motion.div variants={bentoItem} className="lg:col-span-8 glass-panel p-6 flex flex-col relative overflow-hidden group hover:bg-primary-container/30 transition-colors hover-lift">
                <div className="absolute top-0 right-0 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4 relative z-10">
                  <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
                  <h3 className="text-headline-md font-bold">Sensors</h3>
                  <span className="ml-auto bg-tertiary/10 text-tertiary px-2 py-1 rounded-full text-[10px] font-bold tracking-widest">REAL-TIME TELEMETRY</span>
                </div>
                <p className="text-body-md text-on-surface-variant relative z-10 max-w-xl mb-auto">
                  Ingest continuous, high-fidelity streams from a unified global matrix of satellite constellations, deep-sea sonobuoys, and terrestrial mesh arrays.
                </p>
                <div ref={barsRef} className="h-16 w-full flex items-end gap-1 relative z-10 opacity-60">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div key={i} className={`w-2 ${i % 4 === 3 ? 'bg-secondary-container' : 'bg-tertiary'} transition-all duration-500`} style={{ height: `${Math.random() * 80 + 10}%` }} />
                  ))}
                </div>
              </motion.div>

              {/* Networks (4 cols) */}
              <motion.div variants={bentoItem} className="lg:col-span-4 glass-panel p-6 flex flex-col relative overflow-hidden group hover:bg-primary-container/30 transition-colors hover-lift">
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                  <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                  <h3 className="text-headline-md font-bold">Networks</h3>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  Secure, high-resilience topology ensuring zero-trust, mission-critical connectivity across all operational theaters.
                </p>
                <div className="mt-auto flex justify-between items-center bg-surface-container/50 p-3 rounded tech-border">
                  <span className="text-mono-data text-on-surface-variant">UPTIME</span>
                  <span className="text-mono-data text-tertiary font-bold">99.999%</span>
                </div>
              </motion.div>

              {/* Analytics (5 cols) */}
              <motion.div variants={bentoItem} className="lg:col-span-5 glass-panel p-6 flex flex-col relative overflow-hidden group hover:bg-primary-container/30 transition-colors hover-lift">
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                  <span className="material-symbols-outlined text-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                  <h3 className="text-headline-md font-bold">Analytics</h3>
                  <span className="ml-auto bg-secondary-container/10 text-secondary-container px-2 py-1 rounded-full text-[10px] font-bold tracking-widest">PREDICTIVE</span>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  Deploy causal inference engines and multi-variable kinematics to model threat vectors and forecast marine anomalies before they manifest.
                </p>
                <div className="mt-auto w-full h-24 border border-white/10 rounded relative overflow-hidden">
                  <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,100 L0,50 Q25,20 50,60 T100,30 L100,100 Z" fill="rgba(255,101,0,0.1)" />
                    <path d="M0,50 Q25,20 50,60 T100,30" fill="none" stroke="#FF6500" strokeWidth="2" />
                  </svg>
                </div>
              </motion.div>

              {/* Archive (7 cols) */}
              <motion.div variants={bentoItem} className="lg:col-span-7 glass-panel p-6 flex flex-col relative overflow-hidden group hover:bg-primary-container/30 transition-colors hover-lift">
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
                  <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                  <h3 className="text-headline-md font-bold">Archive</h3>
                </div>
                <p className="text-body-md text-on-surface-variant">
                  Immutable, high-performance provenance logs and historical mission data storage. Query petabytes of spatiotemporal records with sub-second latency.
                </p>
                <div className="mt-auto flex flex-col gap-1">
                  {['994-A', '994-B', '994-C'].map((id, i) => (
                    <div key={id} className={`flex justify-between items-center px-2 py-1 rounded tech-border h-8 ${i % 2 === 0 ? 'bg-surface-container/40' : 'bg-surface-container/20'}`}>
                      <span className="text-[11px] font-mono text-on-surface-variant">LOG_ID: {id}</span>
                      <span className="text-[11px] font-mono text-tertiary">VERIFIED_SECURE</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 bg-surface-container-lowest border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 max-w-7xl mx-auto">
          <p className="text-label-caps text-on-surface-variant">© 2024 Aegis Marine Intelligence. Tactical operations secured.</p>
          <div className="flex flex-wrap gap-4 md:justify-end">
            {['Privacy Protocol', 'Service Terms', 'Contact Command', 'System Status'].map(link => (
              <a key={link} href="#" className="text-on-surface-variant hover:text-on-surface transition-colors text-body-sm">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
