import React, { useRef } from 'react';
import { UploadCloud, FileText, Folder, Search, Zap, BarChart2, Brain, Lock, CheckCircle2, Shield, Terminal, Moon, Sun, Github } from 'lucide-react';
import { cn } from './lib/utils';

interface LandingPageProps {
  onFilesSelected: (files: FileList | File[]) => void;
  isParsing: boolean;
  parseProgress: {
    totalFiles: number;
    parsedFiles: number;
    currentFile: string;
    fileIndex: number;
    fileName: string;
    message: string;
  };
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export function LandingPage({ onFilesSelected, isParsing, parseProgress, onDrop, onDragOver, theme, toggleTheme }: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)] font-sans selection:bg-[var(--color-primary-dim)]/30 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-16 lg:px-24 py-6 w-full max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[var(--color-primary)] to-[#6b3fd4] p-2 rounded-lg shadow-[0_0_15px_rgba(132,85,239,0.4)] border border-white/10">
            <Terminal className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--color-on-surface)]">LogNinja</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--color-outline)]">
          <a href="#features" className="hover:text-[var(--color-on-surface)] transition-colors">Features</a>
          <a href="#privacy" className="hover:text-[var(--color-on-surface)] transition-colors">Privacy</a>
          <a href="https://github.com/nagarjunx/log_ninja" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-on-surface)] transition-colors">GitHub</a>
        </nav>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--color-surface-container-high)] text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors cursor-pointer">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[var(--color-primary-dim)] to-[var(--color-primary)] text-[var(--color-on-primary)] font-semibold text-sm shadow-[0_0_15px_rgba(132,85,239,0.3)] hover:shadow-[0_0_25px_rgba(132,85,239,0.5)] transition-all"
          >
            Get Started
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 w-full max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)]/30 mb-8">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-tertiary)]">✨ 100% Client-Side • Zero Data Leakage</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[var(--color-on-surface)] leading-[1.1] mb-6">
            Slice Through Your Logs.<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary-dim)] to-[var(--color-primary)]">With Ninja Precision.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--color-outline)] max-w-2xl mb-10 leading-relaxed">
            Upload any log file or entire folder. Auto-detect formats, parse in Web Workers, visualize with interactive charts — all in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--color-primary-dim)] to-[var(--color-primary)] text-[var(--color-on-primary)] font-bold text-base shadow-[0_0_20px_rgba(132,85,239,0.4)] hover:shadow-[0_0_30px_rgba(132,85,239,0.6)] transition-all"
            >
              Upload Logs <span className="ml-1">→</span>
            </button>
          </div>
        </section>


        {/* Upload Area */}
        <section className="w-full max-w-7xl mx-auto px-6 mb-32">
          <div
            className="relative w-full rounded-3xl border border-dashed border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)] p-12 md:p-20 flex flex-col items-center text-center transition-colors hover:bg-[var(--color-surface-container)]/50"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            {isParsing ? (
              <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-container-high)] flex items-center justify-center mb-2 animate-pulse shadow-[0_0_30px_rgba(132,85,239,0.2)]">
                  <Zap className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-on-surface)]">Parsing Logs...</h2>
                {parseProgress && (
                  <div className="w-full space-y-3">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[var(--color-outline)]">
                      <span className="truncate max-w-[200px]">{parseProgress.message || parseProgress.fileName}</span>
                      <span>{parseProgress.fileIndex} / {parseProgress.totalFiles}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-container-high)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(186,158,255,0.5)]"
                        style={{ width: `${(parseProgress.fileIndex / Math.max(1, parseProgress.totalFiles)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-container-high)] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(132,85,239,0.15)]">
                  <UploadCloud className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h2 className="text-3xl font-bold text-[var(--color-on-surface)] mb-3">Drop your log files or folder here</h2>
                <p className="text-[var(--color-outline)] mb-10 max-w-md">
                  No files ever leave your machine. Processing happens entirely in-memory.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
                    accept=".log,.txt,.json,.ndjson,.out,.err,.syslog,text/plain"
                  />
                  <input
                    type="file"
                    className="hidden"
                    ref={folderInputRef}
                    onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
                    {...{ webkitdirectory: "", directory: "" } as any}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-xl font-semibold transition-colors border border-[var(--color-outline-variant)]/20"
                  >
                    <FileText className="w-5 h-5 text-[var(--color-outline)]" /> Select Files
                  </button>
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-bright)] text-[var(--color-on-surface)] rounded-xl font-semibold transition-colors border border-[var(--color-outline-variant)]/20"
                  >
                    <Folder className="w-5 h-5 text-[var(--color-outline)]" /> Select Folder
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {['APACHE', 'NGINX', 'JSON', 'LOG4J', 'SYSLOG', 'GENERIC'].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-md bg-[var(--color-surface-container)] text-[10px] font-bold tracking-wider text-[var(--color-outline)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="w-full px-6 md:px-16 lg:px-24 mb-32 max-w-[1920px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[var(--color-on-surface)] mb-4">Precision Engineered</h2>
            <div className="w-16 h-1 bg-[var(--color-primary-dim)] mx-auto rounded-full"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Search, title: "Auto-Format Detection", desc: "LogNinja instantly recognizes and parses over 20+ common log formats automatically upon drop." },
              { icon: Zap, title: "Web Worker Parsing", desc: "Multi-threaded processing ensures your UI stays silky smooth even when crunching millions of log lines." },
              { icon: BarChart2, title: "Interactive Charts", desc: "Spot anomalies instantly with high-performance time-series charts and error distribution heatmaps." },
              { icon: Search, title: "Regex Search", desc: "Powerful search engine with full RegEx support and case-sensitivity toggles for needle-in-haystack moments." },
              { icon: Brain, title: "Smart Insights", desc: "AI-driven pattern matching groups similar logs to reveal recurring root causes without manual effort." },
              { icon: Lock, title: "100% Private", desc: "No tracking, no analytics, no servers. Your sensitive logs are processed locally and only exist in your RAM." }
            ].map((feature, i) => (
              <div key={i} className="bg-[var(--color-surface-container-low)] p-8 rounded-2xl border border-[var(--color-outline-variant)]/10 hover:bg-[var(--color-surface-container)] transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-container-high)] flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(132,85,239,0.2)] transition-shadow">
                  <feature.icon className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-on-surface)] mb-3">{feature.title}</h3>
                <p className="text-[var(--color-outline)] leading-relaxed text-sm">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Section */}
        <section id="privacy" className="w-full px-6 md:px-16 lg:px-24 mb-32 flex flex-col lg:flex-row items-center justify-between gap-16 max-w-[1920px] mx-auto">
          <div className="flex-1 w-full">
            <div className="bg-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-outline-variant)]/20 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-surface-container)]">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="ml-4 text-[10px] font-mono text-[var(--color-outline)] uppercase tracking-widest">LogNinja Security Console</span>
              </div>
              <div className="p-6 font-mono text-sm text-[var(--color-outline)] space-y-4 relative">
                <div className="absolute bottom-6 right-6 opacity-10">
                  <Shield className="w-32 h-32" />
                </div>
                <p><span className="text-[var(--color-outline-variant)]">#</span> <span className="text-[var(--color-primary)]">systemctl status security.service</span></p>
                <p><span className="text-[var(--color-primary-dim)]">STATUS:</span> ENCRYPTED_SESSION_ACTIVE</p>
                <div className="space-y-1">
                  <p><span className="text-[var(--color-outline)]">CLIENT_IP:</span> ::ffff:127.0.0.1 (Local Only)</p>
                  <p><span className="text-[var(--color-outline)]">REMOTE_POST:</span> DISABLED</p>
                  <p><span className="text-[var(--color-outline)]">DATABASE:</span> Browser-V8-IndexedDB (Temp)</p>
                  <p><span className="text-[var(--color-outline)]">SESSION:</span> Ephemeral</p>
                </div>
                <p className="text-[var(--color-outline-variant)] animate-pulse">_ Waiting for log stream...</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--color-on-surface)] mb-8 leading-tight">
              Private by Design.<br />Truly Local.
            </h2>
            <div className="space-y-8">
              {[
                { title: "No Server Uploads", desc: "Unlike other online tools, LogNinja doesn't send a single byte of your data to a remote server." },
                { title: "WebAssembly Acceleration", desc: "We use high-performance Rust compiled to WASM to process gigabytes of data directly in your browser." },
                { title: "Zero Analytics", desc: "No Google Analytics. No Mixpanel. We value your intellectual property as much as you do." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle2 className="w-6 h-6 text-[var(--color-tertiary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-1">{item.title}</h3>
                    <p className="text-[var(--color-outline)] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-outline-variant)]/20 py-6 px-6 mt-auto w-full">
        <div className="w-full max-w-[1920px] px-0 md:px-10 lg:px-18 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-on-surface)]">
              <Terminal className="w-5 h-5 text-[var(--color-primary)]" strokeWidth={2.5} />
              <span className="text-base font-bold tracking-tight">LogNinja</span>
            </div>
            <div className="w-[1px] h-4 bg-[var(--color-outline-variant)]/30"></div>
            <a href="https://github.com/nagarjunx/log_ninja" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[var(--color-outline)] hover:text-[var(--color-on-surface)] transition-colors">
              <Github className="w-4 h-4" />
              <span className="font-medium">GitHub</span>
            </a>
          </div>

          <div className="text-sm font-medium text-[var(--color-outline)] text-center md:text-right">
            © 2026 LogNinja • Built with 💖 by Nagarjuna
          </div>
        </div>
      </footer>
    </div>
  );
}
