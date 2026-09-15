import { useMemo, useState, type CSSProperties } from "react";
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronDown,
  CircleHelp,
  CloudCog,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  HardDrive,
  LayoutGrid,
  Menu,
  Network,
  Pause,
  Play,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Timer,
  Zap,
} from "lucide-react";

type ServiceStatus = "running" | "paused" | "attention";

type Service = {
  id: string;
  name: string;
  role: string;
  status: ServiceStatus;
  version: string;
  port: string;
  cpu: number;
  memory: string;
  accent: string;
  source: string;
  lastEvent: string;
  route: string;
};

const initialServices: Service[] = [
  {
    id: "forge",
    name: "Forge",
    role: "coding runner",
    status: "running",
    version: "2.4.1",
    port: "4410",
    cpu: 41,
    memory: "1.8 GB",
    accent: "#d8663e",
    source: "hermes/forge:2.4.1",
    lastEvent: "job completed · 18s ago",
    route: "Editor → Forge",
  },
  {
    id: "mistral",
    name: "Mistral 7B",
    role: "local LLM",
    status: "running",
    version: "0.9.8",
    port: "8123",
    cpu: 67,
    memory: "6.2 GB",
    accent: "#278d87",
    source: "ollama/mistral:7b",
    lastEvent: "token stream active · 4s ago",
    route: "Forge → Mistral",
  },
  {
    id: "n8n",
    name: "n8n",
    role: "automation",
    status: "attention",
    version: "1.33.0",
    port: "5678",
    cpu: 12,
    memory: "742 MB",
    accent: "#c79235",
    source: "n8nio/n8n:1.33",
    lastEvent: "webhook retry · 2m ago",
    route: "Webhook → n8n",
  },
  {
    id: "relay",
    name: "Relay",
    role: "interface bridge",
    status: "paused",
    version: "0.6.2",
    port: "3090",
    cpu: 0,
    memory: "—",
    accent: "#6b77a5",
    source: "hermes/relay:0.6.2",
    lastEvent: "manually paused · 11m ago",
    route: "Relay → Editor",
  },
];

const routeEvents = [
  { time: "09:41:22", label: "Mistral 7B", text: "streaming response to Forge", tone: "teal" },
  { time: "09:40:57", label: "Forge", text: "completed task /workspace/api", tone: "orange" },
  { time: "09:39:10", label: "n8n", text: "waiting for webhook acknowledgement", tone: "amber" },
  { time: "09:36:48", label: "Hermes", text: "telemetry snapshot written", tone: "slate" },
];

function statusLabel(status: ServiceStatus) {
  return status === "attention" ? "needs attention" : status;
}

function HermesOrbit() {
  const [services, setServices] = useState(initialServices);
  const [selectedId, setSelectedId] = useState("forge");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"fleet" | "routes" | "runtime">("fleet");
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("Live telemetry · updated 4 seconds ago");

  const filtered = useMemo(
    () =>
      services.filter((service) =>
        `${service.name} ${service.role} ${service.route}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [services, query],
  );
  const selected = services.find((service) => service.id === selectedId) ?? services[0];
  const running = services.filter((service) => service.status === "running").length;
  const attention = services.filter((service) => service.status === "attention").length;

  const toggleService = (id: string) => {
    setServices((current) =>
      current.map((service) =>
        service.id !== id
          ? service
          : {
              ...service,
              status: service.status === "running" ? "paused" : "running",
              lastEvent: service.status === "running" ? "manually paused · just now" : "started by operator · just now",
            },
      ),
    );
    const name = services.find((service) => service.id === id)?.name ?? "Service";
    setNotice(`${name} lifecycle action accepted · just now`);
  };

  return (
    <div className="orbit">
      <style>{`
        .orbit {
          --ink: #1f2930;
          --muted: #78847f;
          --line: #d9ddd5;
          --paper: #f5f5ef;
          --panel: #fbfbf7;
          --navy: #20343b;
          --teal: #278d87;
          --orange: #d8663e;
          min-height: 100dvh;
          color: var(--ink);
          background: var(--paper);
          font-family: "Manrope", "Trebuchet MS", sans-serif;
          font-size: 13px;
          letter-spacing: -.01em;
        }
        .orbit * { box-sizing: border-box; }
        .orbit button, .orbit input { font: inherit; }
        .orbit button { cursor: pointer; }
        .orbit-shell { min-height: 100dvh; display: flex; flex-direction: column; }
        .orbit-top {
          min-height: 74px;
          padding: 0 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          color: #e9eee8;
          background: var(--navy);
        }
        .orbit-brand { display: flex; align-items: center; gap: 12px; min-width: 205px; }
        .orbit-mark {
          width: 31px; height: 31px; display: grid; place-items: center;
          border: 1px solid rgba(214, 239, 225, .66); color: #9fe2cf;
          position: relative; font: 700 17px "Space Grotesk", sans-serif;
        }
        .orbit-mark:after { content: ""; position: absolute; inset: 5px; border: 1px solid rgba(159, 226, 207, .35); }
        .orbit-brand strong { display: block; font: 700 16px "Space Grotesk", sans-serif; letter-spacing: -.04em; }
        .orbit-brand span { display: block; margin-top: 2px; color: rgba(233, 238, 232, .52); font: 9px "DM Mono", monospace; letter-spacing: .05em; text-transform: uppercase; }
        .orbit-nav { display: flex; align-items: center; gap: 7px; height: 100%; }
        .orbit-nav button {
          align-self: stretch; border: 0; border-bottom: 2px solid transparent; background: transparent;
          padding: 0 14px; color: rgba(233, 238, 232, .58); font-size: 11px; font-weight: 700;
        }
        .orbit-nav button:hover, .orbit-nav button.active { color: #f2f4ec; border-bottom-color: #9fe2cf; }
        .orbit-top-actions { display: flex; align-items: center; gap: 12px; min-width: 205px; justify-content: flex-end; }
        .orbit-signal { display: flex; align-items: center; gap: 8px; color: #aadacc; font: 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .08em; }
        .orbit-signal i { width: 7px; height: 7px; display: block; border-radius: 50%; background: #85d2a8; box-shadow: 0 0 0 4px rgba(133, 210, 168, .13); }
        .orbit-icon {
          width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid rgba(233, 238, 232, .18);
          color: rgba(233, 238, 232, .75); background: transparent; border-radius: 4px;
        }
        .orbit-icon:hover { background: rgba(233, 238, 232, .1); color: #fff; }
        .orbit-menu { display: none; }
        .orbit-subbar {
          display: flex; align-items: center; justify-content: space-between; gap: 18px;
          padding: 17px 42px; border-bottom: 1px solid var(--line); background: rgba(251, 251, 247, .82);
        }
        .crumbs { display: flex; align-items: center; gap: 9px; color: var(--muted); font: 10px "DM Mono", monospace; }
        .crumbs b { color: var(--ink); font-weight: 500; }
        .sub-actions { display: flex; align-items: center; gap: 16px; color: var(--muted); font: 10px "DM Mono", monospace; }
        .sub-actions button { border: 0; color: inherit; background: transparent; display: inline-flex; align-items: center; gap: 7px; }
        .sub-actions button:hover { color: var(--teal); }
        .orbit-main { width: min(1420px, calc(100% - 84px)); margin: 0 auto; padding: 42px 0 70px; }
        .orbit-hero { display: flex; justify-content: space-between; gap: 32px; align-items: flex-end; margin-bottom: 37px; }
        .eyebrow { color: var(--teal); font: 10px "DM Mono", monospace; letter-spacing: .14em; text-transform: uppercase; }
        .orbit-hero h1 { max-width: 650px; margin: 9px 0 11px; color: var(--ink); font: 600 clamp(34px, 4.5vw, 60px)/.98 "Space Grotesk", sans-serif; letter-spacing: -.07em; }
        .orbit-hero p { max-width: 530px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
        .hero-health { width: 308px; flex: none; padding: 18px 19px; border: 1px solid var(--line); background: var(--panel); }
        .hero-health-head { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font: 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .08em; }
        .hero-health-head strong { color: var(--teal); font-weight: 500; }
        .health-gauge { height: 7px; margin: 17px 0 10px; overflow: hidden; background: #e4e8e1; border-radius: 2px; }
        .health-gauge i { display: block; width: 82%; height: 100%; background: var(--teal); }
        .health-foot { display: flex; justify-content: space-between; color: var(--muted); font: 9px "DM Mono", monospace; }
        .health-foot b { color: var(--ink); font-weight: 500; }
        .orbit-metrics { display: grid; grid-template-columns: 1.15fr 1fr 1fr 1fr; gap: 1px; margin-bottom: 29px; border: 1px solid var(--line); background: var(--line); }
        .metric { min-height: 95px; padding: 17px 19px; background: var(--panel); position: relative; }
        .metric:first-child { background: var(--navy); color: #edf2ec; }
        .metric span { display: block; color: var(--muted); font: 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .07em; }
        .metric:first-child span { color: rgba(237, 242, 236, .57); }
        .metric strong { display: block; margin-top: 9px; font: 600 26px/1 "Space Grotesk", sans-serif; letter-spacing: -.05em; }
        .metric strong small { color: var(--muted); font: 12px "DM Mono", monospace; letter-spacing: 0; }
        .metric:first-child strong small { color: rgba(237, 242, 236, .55); }
        .metric .metric-icon { position: absolute; top: 18px; right: 18px; color: var(--teal); }
        .orbit-workspace { display: grid; grid-template-columns: minmax(0, 1.54fr) minmax(315px, .76fr); gap: 22px; align-items: start; }
        .workspace-heading { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; }
        .workspace-heading h2 { margin: 7px 0 0; font: 600 20px "Space Grotesk", sans-serif; letter-spacing: -.045em; }
        .workspace-heading > span { color: var(--muted); font: 9px "DM Mono", monospace; }
        .fleet-panel { border: 1px solid var(--line); background: var(--panel); }
        .fleet-tools { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding: 13px 16px; border-bottom: 1px solid var(--line); }
        .orbit-search { height: 32px; width: min(300px, 100%); display: flex; align-items: center; gap: 8px; color: var(--muted); border: 1px solid var(--line); background: var(--paper); padding: 0 9px; }
        .orbit-search:focus-within { border-color: rgba(39, 141, 135, .7); }
        .orbit-search input { min-width: 0; width: 100%; border: 0; outline: 0; color: var(--ink); background: transparent; font-size: 10px; }
        .orbit-search input::placeholder { color: #a0aaa4; }
        .fleet-sort { display: flex; align-items: center; gap: 8px; color: var(--muted); font: 9px "DM Mono", monospace; }
        .fleet-sort button { border: 0; background: transparent; color: var(--ink); display: inline-flex; align-items: center; gap: 4px; font: inherit; }
        .service-row {
          display: grid; grid-template-columns: 8px minmax(130px, 1.2fr) minmax(105px, .8fr) minmax(112px, .8fr) auto;
          align-items: center; min-height: 91px; gap: 14px; padding: 14px 16px; border-bottom: 1px solid var(--line);
          background: transparent; text-align: left; transition: background .18s ease, transform .18s ease;
        }
        .service-row:last-child { border-bottom: 0; }
        .service-row:hover, .service-row.selected { background: #f0f3ed; }
        .service-row.selected { box-shadow: inset 3px 0 0 var(--teal); }
        .service-stripe { align-self: stretch; width: 3px; border-radius: 4px; background: var(--accent); }
        .service-identity { min-width: 0; }
        .service-name { display: flex; align-items: center; gap: 8px; color: var(--ink); font: 600 14px "Space Grotesk", sans-serif; letter-spacing: -.035em; }
        .service-name small { color: var(--muted); font: 9px "DM Mono", monospace; }
        .service-role { margin-top: 5px; color: var(--muted); font-size: 10px; }
        .service-telemetry { min-width: 0; }
        .telemetry-line { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font: 9px "DM Mono", monospace; }
        .telemetry-line b { color: var(--ink); font-weight: 500; }
        .microbar { height: 4px; margin-top: 8px; background: #e2e6df; }
        .microbar i { display: block; height: 100%; background: var(--accent); }
        .service-route { min-width: 0; color: var(--muted); font: 9px "DM Mono", monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .route-caption { display: block; margin-top: 7px; color: #a0aaa4; font-size: 8px; }
        .service-cta { display: flex; flex-direction: column; align-items: flex-end; gap: 9px; }
        .status { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font: 9px "DM Mono", monospace; white-space: nowrap; }
        .status i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .status.running { color: #3b9c7d; }.status.paused { color: #7e8792; }.status.attention { color: #c79235; }
        .row-action { height: 26px; padding: 0 8px; display: inline-flex; align-items: center; gap: 5px; border: 1px solid var(--line); color: var(--ink); background: transparent; font: 9px "DM Mono", monospace; }
        .row-action:hover { border-color: var(--teal); color: var(--teal); background: #fff; }
        .empty-fleet { min-height: 230px; display: grid; place-items: center; color: var(--muted); text-align: center; padding: 32px; }
        .empty-fleet strong { display: block; color: var(--ink); font: 600 16px "Space Grotesk", sans-serif; }
        .empty-fleet span { display: block; margin-top: 7px; font-size: 11px; }
        .inspector { position: sticky; top: 18px; min-height: 470px; border: 1px solid var(--line); background: var(--navy); color: #ecf1ea; }
        .inspector-top { display: flex; justify-content: space-between; align-items: flex-start; padding: 21px 21px 18px; border-bottom: 1px solid rgba(232, 240, 233, .13); }
        .inspector-label { color: #9fe2cf; font: 9px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .13em; }
        .inspector h3 { margin: 7px 0 0; font: 600 26px "Space Grotesk", sans-serif; letter-spacing: -.055em; }
        .inspector-role { margin-top: 5px; color: rgba(236, 241, 234, .57); font-size: 10px; }
        .inspector-close { width: 27px; height: 27px; border: 1px solid rgba(232, 240, 233, .18); background: transparent; color: rgba(232, 240, 233, .66); display: grid; place-items: center; }
        .inspector-close:hover { background: rgba(232, 240, 233, .1); }
        .inspector-body { padding: 20px 21px; }
        .inspector-status-row { display: flex; align-items: center; justify-content: space-between; }
        .inspector .status { color: #91d3b6; }.inspector .status.attention { color: #f3c777; }.inspector .status.paused { color: #a3adb9; }
        .inspector-status-row > span:last-child { color: rgba(236, 241, 234, .52); font: 9px "DM Mono", monospace; }
        .inspector-action { width: 100%; height: 38px; margin: 19px 0 21px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 0; color: var(--navy); background: #a8dbc6; font-size: 10px; font-weight: 800; }
        .inspector-action:hover { background: #c5edda; }
        .inspector-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(232, 240, 233, .13); border: 1px solid rgba(232, 240, 233, .13); }
        .inspector-fact { min-height: 65px; padding: 12px; background: rgba(32, 52, 59, .78); }
        .inspector-fact span { display: block; color: rgba(236, 241, 234, .48); font: 8px "DM Mono", monospace; text-transform: uppercase; letter-spacing: .06em; }
        .inspector-fact strong { display: block; margin-top: 7px; color: #f2f3eb; font: 500 12px "DM Mono", monospace; }
        .inspector-source { margin-top: 21px; padding-top: 17px; border-top: 1px solid rgba(232, 240, 233, .13); }
        .inspector-source > span { color: rgba(236, 241, 234, .48); font: 8px "DM Mono", monospace; text-transform: uppercase; }
        .inspector-source code { display: block; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d7e6dc; font: 10px "DM Mono", monospace; }
        .inspector-foot { display: flex; align-items: center; gap: 7px; margin-top: 17px; color: rgba(236, 241, 234, .5); font-size: 9px; }
        .inspector-foot svg { color: #9fe2cf; }
        .routes-view, .runtime-view { grid-column: 1 / -1; border: 1px solid var(--line); background: var(--panel); padding: 22px; }
        .routes-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .routes-head h2 { margin: 0; font: 600 20px "Space Grotesk", sans-serif; letter-spacing: -.045em; }
        .routes-head span { color: var(--muted); font: 9px "DM Mono", monospace; }
        .route-event { display: grid; grid-template-columns: 85px 120px 1fr auto; align-items: center; gap: 16px; min-height: 54px; border-top: 1px solid var(--line); }
        .route-event time { color: var(--muted); font: 9px "DM Mono", monospace; }
        .route-event strong { font-size: 11px; }.route-event p { margin: 0; color: var(--muted); font-size: 11px; }.route-event b { color: var(--teal); font: 9px "DM Mono", monospace; font-weight: 500; }
        .runtime-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 18px; }
        .runtime-card { padding: 18px; border: 1px solid var(--line); background: #f5f6f1; }
        .runtime-card h3 { margin: 0 0 16px; font: 600 15px "Space Grotesk", sans-serif; }
        .runtime-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-top: 1px solid var(--line); color: var(--muted); font-size: 10px; }
        .runtime-row b { color: var(--ink); font: 10px "DM Mono", monospace; font-weight: 500; }
        .orbit-toast { position: fixed; right: 28px; bottom: 24px; z-index: 4; display: flex; align-items: center; gap: 8px; padding: 11px 13px; color: #eaf4ec; background: var(--navy); box-shadow: 0 10px 25px rgba(31, 49, 53, .16); font: 9px "DM Mono", monospace; animation: orbitIn .25s ease-out both; }
        .orbit-toast svg { color: #9fe2cf; }
        @keyframes orbitIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 980px) {
          .orbit-top, .orbit-subbar { padding-left: 24px; padding-right: 24px; }
          .orbit-main { width: min(100% - 48px, 800px); }
          .orbit-hero { align-items: flex-start; flex-direction: column; }.hero-health { width: 100%; }
          .orbit-workspace { grid-template-columns: 1fr; }.inspector { position: static; }
          .orbit-metrics { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 700px) {
          .orbit-top { min-height: 63px; padding: 0 17px; }.orbit-brand { min-width: 0; }.orbit-nav, .orbit-top-actions .orbit-signal { display: none; }
          .orbit-top-actions { min-width: 0; }.orbit-menu { display: grid; }
          .orbit-subbar { padding: 14px 17px; }.sub-actions span { display: none; }
          .orbit-main { width: calc(100% - 34px); padding-top: 29px; }.orbit-hero { margin-bottom: 27px; }
          .orbit-hero h1 { font-size: 39px; }.orbit-metrics { grid-template-columns: 1fr 1fr; }.metric { min-height: 83px; padding: 14px; }.metric strong { font-size: 22px; }.metric .metric-icon { display: none; }
          .fleet-tools { align-items: stretch; flex-direction: column; }.orbit-search { width: 100%; }.fleet-sort { justify-content: space-between; }
          .service-row { grid-template-columns: 6px minmax(0, 1fr) auto; gap: 11px; padding: 14px 12px; }.service-telemetry, .service-route { display: none; }.service-cta { align-items: flex-end; }
          .route-event { grid-template-columns: 63px 1fr; gap: 8px; padding: 11px 0; }.route-event p { grid-column: 2; }.route-event b { display: none; }
          .runtime-grid { grid-template-columns: 1fr; }.orbit-toast { right: 17px; bottom: 17px; max-width: calc(100% - 34px); }
        }
      `}</style>
      <div className="orbit-shell">
        <header className="orbit-top">
          <div className="orbit-brand">
            <div className="orbit-mark">H</div>
            <div><strong>Hermes</strong><span>local control plane</span></div>
          </div>
          <nav className="orbit-nav" aria-label="Hermes views">
            <button className={view === "fleet" ? "active" : ""} onClick={() => setView("fleet")}>Fleet</button>
            <button className={view === "routes" ? "active" : ""} onClick={() => setView("routes")}>Routes</button>
            <button className={view === "runtime" ? "active" : ""} onClick={() => setView("runtime")}>Runtime</button>
          </nav>
          <div className="orbit-top-actions">
            <div className="orbit-signal"><i /> socket online</div>
            <button className="orbit-icon orbit-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={16} /></button>
            <button className="orbit-icon" aria-label="Help"><CircleHelp size={16} /></button>
          </div>
        </header>
        {menuOpen && (
          <div style={{ position: "absolute", right: 17, top: 57, zIndex: 5, background: "#20343b", border: "1px solid rgba(232,240,233,.2)", padding: "8px", display: "grid", gap: 3 }}>
            {(["fleet", "routes", "runtime"] as const).map((item) => <button key={item} onClick={() => { setView(item); setMenuOpen(false); }} style={{ border: 0, background: "transparent", color: "#e9eee8", padding: "8px 14px", textAlign: "left", fontSize: 11, textTransform: "capitalize" }}>{item}</button>)}
          </div>
        )}
        <div className="orbit-subbar">
          <div className="crumbs"><span>WORKSPACE</span><b>/</b><b>machine view</b></div>
          <div className="sub-actions">
            <button onClick={() => setNotice("Host scan complete · no new services") }><RefreshCw size={13} /> <span>Scan host</span></button>
            <button><Settings2 size={13} /> <span>Preferences</span></button>
          </div>
        </div>
        <main className="orbit-main">
          <section className="orbit-hero">
            <div>
              <div className="eyebrow">Operator console / Wednesday 14 Feb</div>
              <h1>Everything talking<br />to everything else.</h1>
              <p>A route-first view of your local stack. Watch the machine breathe, then intervene at the exact service that needs you.</p>
            </div>
            <div className="hero-health">
              <div className="hero-health-head"><span>Machine posture</span><strong>stable</strong></div>
              <div className="health-gauge"><i /></div>
              <div className="health-foot"><span>capacity headroom</span><b>18.4%</b></div>
            </div>
          </section>
          <section className="orbit-metrics" aria-label="Machine summary">
            <div className="metric"><span>managed services</span><strong>{running}<small> / {services.length} online</small></strong><Gauge className="metric-icon" size={18} /></div>
            <div className="metric"><span>cpu load</span><strong>42.8%</strong><Cpu className="metric-icon" size={17} /></div>
            <div className="metric"><span>memory</span><strong>68.1%</strong><Database className="metric-icon" size={17} /></div>
            <div className="metric"><span>attention queue</span><strong>{attention}</strong><Activity className="metric-icon" size={17} /></div>
          </section>
          {view === "fleet" && (
            <div className="orbit-workspace">
              <section>
                <div className="workspace-heading"><div><div className="eyebrow">Managed fleet</div><h2>Choose a service to focus</h2></div><span>{filtered.length} of {services.length} visible</span></div>
                <div className="fleet-panel">
                  <div className="fleet-tools">
                    <label className="orbit-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by name, role, or route" aria-label="Filter services" /></label>
                    <div className="fleet-sort">sort <button>last signal <ChevronDown size={13} /></button></div>
                  </div>
                  {filtered.length ? filtered.map((service) => (
                    <button className={`service-row ${selected?.id === service.id ? "selected" : ""}`} key={service.id} onClick={() => setSelectedId(service.id)} style={{ "--accent": service.accent } as CSSProperties}>
                      <i className="service-stripe" />
                      <div className="service-identity"><div className="service-name">{service.name}<small>v{service.version}</small></div><div className="service-role">{service.role}</div></div>
                      <div className="service-telemetry"><div className="telemetry-line"><span>CPU</span><b>{service.cpu}%</b></div><div className="microbar"><i style={{ width: `${service.cpu}%` }} /></div></div>
                      <div className="service-route"><span>{service.route}</span><span className="route-caption">{service.lastEvent}</span></div>
                      <div className="service-cta"><span className={`status ${service.status}`}><i />{statusLabel(service.status)}</span><span className="row-action">{service.status === "running" ? <Pause size={11} /> : <Play size={11} />}{service.status === "running" ? "pause" : "start"}</span></div>
                    </button>
                  )) : <div className="empty-fleet"><div><Boxes size={24} /><strong>No service in orbit</strong><span>Try a different route, role, or service name.</span></div></div>}
                </div>
              </section>
              {selected && <aside className="inspector">
                <div className="inspector-top"><div><div className="inspector-label">Focused service</div><h3>{selected.name}</h3><div className="inspector-role">{selected.role} · port {selected.port}</div></div><button className="inspector-close" onClick={() => setSelectedId("")} aria-label="Clear focus"><ChevronDown size={15} /></button></div>
                <div className="inspector-body">
                  <div className="inspector-status-row"><span className={`status ${selected.status}`}><i />{statusLabel(selected.status)}</span><span>signal {selected.lastEvent.split("·")[1]}</span></div>
                  <button className="inspector-action" onClick={() => toggleService(selected.id)}>{selected.status === "running" ? <><Pause size={14} /> Pause service</> : <><Play size={14} /> Start service</>}</button>
                  <div className="inspector-facts"><div className="inspector-fact"><span>CPU load</span><strong>{selected.cpu}%</strong></div><div className="inspector-fact"><span>Memory</span><strong>{selected.memory}</strong></div><div className="inspector-fact"><span>Port</span><strong>:{selected.port}</strong></div><div className="inspector-fact"><span>Version</span><strong>{selected.version}</strong></div></div>
                  <div className="inspector-source"><span>Container source</span><code>{selected.source}</code></div>
                  <div className="inspector-foot"><GitBranch size={13} /> {selected.route}<ArrowUpRight size={12} /></div>
                </div>
              </aside>}
            </div>
          )}
          {view === "routes" && <section className="routes-view"><div className="routes-head"><h2>Recent route activity</h2><span>tailing /var/run/hermes/events</span></div>{routeEvents.map((event) => <div className="route-event" key={event.time}><time>{event.time}</time><strong>{event.label}</strong><p>{event.text}</p><b>{event.tone}</b></div>)}</section>}
          {view === "runtime" && <section className="runtime-view"><div className="routes-head"><h2>Runtime posture</h2><span>local host · docker bridge</span></div><div className="runtime-grid"><div className="runtime-card"><h3>Host telemetry</h3><div className="runtime-row"><span>Operating system</span><b>macOS 14.3 / arm64</b></div><div className="runtime-row"><span>Docker engine</span><b>25.0.2</b></div><div className="runtime-row"><span>Last sample</span><b>09:41:22</b></div></div><div className="runtime-card"><h3>Guardrails</h3><div className="runtime-row"><span>Confirm stop / restart</span><b>enabled</b></div><div className="runtime-row"><span>Telemetry interval</span><b>15 sec</b></div><div className="runtime-row"><span>Cloud account</span><b>not connected</b></div></div></div></section>}
        </main>
        <div className="orbit-toast"><Check size={14} /> {notice}</div>
      </div>
    </div>
  );
}

export default HermesOrbit;