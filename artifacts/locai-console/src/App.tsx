import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  CircleHelp,
  Cpu,
  Database,
  Download,
  FileCog,
  HardDrive,
  Info,
  LayoutDashboard,
  Link2,
  ExternalLink,
  Loader2,
  Menu,
  MoreHorizontal,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Terminal,
  TimerReset,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  getGetCatalogManifestQueryKey,
  getGetOverviewQueryKey,
  getGetServiceLogsQueryKey,
  getGetServiceQueryKey,
  getHealthCheckQueryKey,
  getListCatalogQueryKey,
  getListConnectionsQueryKey,
  getListServicesQueryKey,
  useControlService,
  useGetCatalogManifest,
  useGetOverview,
  useGetService,
  useGetServiceLogs,
  useHealthCheck,
  useInstallService,
  useListCatalog,
  useListConnections,
  useListServices,
  useRemoveService,
  useUpdateService,
  type CatalogItem,
  type Connection,
  type ManifestDetail,
  type Overview,
  type Service,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/services', label: 'Services', icon: Box },
  { href: '/catalog', label: 'Catalog', icon: ArrowDownToLine },
  { href: '/connections', label: 'Connections', icon: Network },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

const categoryLabels: Record<string, string> = {
  llm: 'LLM runner',
  coding: 'Coding',
  automation: 'Automation',
  interface: 'Interface',
  orchestration: 'Orchestration',
  observability: 'Observability',
  tool: 'Tool & MCP',
  memory: 'Memory & Retrieval',
  runtime: 'Local Runtime',
};

const fallbackActivity = [
  { time: 'now', title: 'Hermes Console connected', detail: 'local control plane is listening', type: 'system' },
  { time: 'recent', title: 'Telemetry window refreshed', detail: 'host metrics sampled from Docker', type: 'telemetry' },
  { time: 'ready', title: 'Lifecycle controls armed', detail: 'actions require one deliberate click', type: 'action' },
];

export interface ActivityEvent {
  id: string;
  time?: string;
  title: string;
  detail: string;
  type?: string;
  timestamp: number;
}

export const getGetActivityQueryKey = () => ['activity'];

export const useGetActivity = ({ query }: { query?: Partial<UseQueryOptions<ActivityEvent[], Error>> } = {}) =>
  useQuery<ActivityEvent[], Error>({
    queryKey: getGetActivityQueryKey(),
    queryFn: () => fetch('/api/activity').then((res) => res.json()),
    ...query,
  });

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(value?: string) {
  if (!value) return 'waiting for signal';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
}

function shortError(error: unknown) {
  return error instanceof Error ? error.message : 'The local adapter did not return a response.';
}

function statusTone(status: string) {
  if (['running', 'healthy', 'connected'].includes(status)) return 'status-good';
  if (['warning', 'degraded', 'pending'].includes(status)) return 'status-warn';
  if (['stopped', 'offline', 'needs-config'].includes(status)) return 'status-bad';
  return 'status-neutral';
}

function StatusDot({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn('status-label', statusTone(status))} data-testid={`status-${status}`}>
      <span className="status-dot" />
      <span>{label ?? status.replace('-', ' ')}</span>
    </span>
  );
}

function MetricBar({ value, tone = 'teal' }: { value: number; tone?: 'teal' | 'orange' }) {
  return (
    <div className="metric-track" aria-label={`${value}% used`}>
      <span className={cn('metric-fill', tone === 'orange' && 'metric-fill-orange')} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function QueryState({ loading, error, onRetry, children }: { loading?: boolean; error?: unknown; onRetry?: () => void; children: ReactNode }) {
  if (loading) {
    return <div className="loading-stack" data-testid="state-loading"><span className="skeleton-shimmer" /><span className="skeleton-shimmer short" /><span className="skeleton-shimmer" /></div>;
  }
  if (error) {
    return (
      <div className="state-card error-state" data-testid="state-error">
        <AlertCircle size={18} />
        <div><strong>Signal unavailable</strong><p>{shortError(error)}</p></div>
        {onRetry && <button className="button button-quiet" onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button>}
      </div>
    );
  }
  return <>{children}</>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const current = navItems.find((item) => item.href === location)?.label ?? (location.startsWith('/services/') ? 'Service detail' : 'LocAI Console');

  return (
    <div className="app-shell">
      <aside className={cn('sidebar', mobileOpen && 'sidebar-open')}>
        <div className="sidebar-brand">
          <div className="brand-mark"><span>L</span><i /></div>
          <div><div className="brand-name">LocAI</div><div className="brand-caption">local control plane</div></div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation"><X size={17} /></button>
        </div>
        <div className="sidebar-rule" />
        <div className="sidebar-section-label eyebrow">Workspace</div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={cn('nav-item', active && 'nav-item-active')} onClick={() => setMobileOpen(false)} data-testid={`link-${item.label.toLowerCase()}`}>
                <Icon size={17} strokeWidth={active ? 2.2 : 1.7} /><span>{item.label}</span>{active && <ChevronRight size={14} className="nav-chevron" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="adapter-card">
            <div className="adapter-top"><span className={cn('live-orb', health.isError ? 'orb-warn' : 'signal-pulse')} /><span className="eyebrow">Adapter</span><span className="adapter-status">{health.isLoading ? 'checking' : health.isError ? 'offline' : 'online'}</span></div>
            <div className="adapter-name">LocAI local socket</div>
            <div className="adapter-detail">127.0.0.1 · Docker bridge</div>
          </div>
          <div className="sidebar-footline"><span>v0.8.4</span><span>·</span><span>safe mode</span></div>
        </div>
      </aside>
      {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu" />}
      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={20} /></button><div className="topbar-context"><span className="eyebrow">LocAI / {current}</span><span className="topbar-path">machine view</span></div></div>
          <div className="topbar-right"><div className="connection-pill"><span className={cn('live-orb small', health.isError ? 'orb-warn' : 'signal-pulse')} />{health.isError ? 'Adapter needs attention' : 'Live telemetry'}</div><button className="icon-button" aria-label="Help" data-testid="button-help"><CircleHelp size={18} /></button></div>
        </header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header fade-up"><div><div className="eyebrow accent-eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

function HostCard({ overview }: { overview: Overview }) {
  const { host } = overview;
  return (
    <section className="panel host-panel fade-up fade-up-delay-1" data-testid="card-host-telemetry">
      <div className="panel-heading"><div><span className="eyebrow">Host telemetry</span><h2>{host.name}</h2></div><div className="host-chip"><HardDrive size={14} /> {host.architecture}</div></div>
      <div className="host-meta"><span>{host.os}</span><span className="meta-divider" /><span>Docker {host.docker}</span><span className="meta-divider" /><span>updated {formatTime(overview.lastUpdated)}</span></div>
      <div className="telemetry-grid">
        <div className="telemetry-cell"><div className="telemetry-label"><Cpu size={15} /> CPU load <strong>{overview.host.cpuPercent}%</strong></div><MetricBar value={overview.host.cpuPercent} /></div>
        <div className="telemetry-cell"><div className="telemetry-label"><Database size={15} /> Memory <strong>{overview.host.memoryPercent}%</strong></div><MetricBar value={overview.host.memoryPercent} tone="orange" /><div className="telemetry-sub">{host.memoryUsed} of {host.memoryTotal}</div></div>
      </div>
    </section>
  );
}

function SummaryRail({ overview }: { overview: Overview }) {
  return (
    <div className="summary-rail fade-up fade-up-delay-1">
      <div className="summary-stat"><span className="summary-number">{overview.running}<small>/{overview.total}</small></span><span className="summary-label">services running</span><span className="summary-mark mark-teal"><Zap size={14} /></span></div>
      <div className="summary-stat"><span className="summary-number">{overview.healthy}</span><span className="summary-label">healthy signals</span><span className="summary-mark mark-green"><ShieldCheck size={14} /></span></div>
      <div className={cn('summary-stat', overview.attention > 0 && 'attention-stat')}><span className="summary-number">{overview.attention}</span><span className="summary-label">need attention</span><span className="summary-mark mark-orange"><AlertCircle size={14} /></span></div>
    </div>
  );
}

function ServiceActionButtons({ service, compact = false }: { service: Service; compact?: boolean }) {
  const queryClient = useQueryClient();
  const control = useControlService();
  const busy = control.isPending;
  const action = (value: 'start' | 'stop' | 'restart') => {
    if ((value === 'stop' || value === 'restart') && localStorage.getItem('hermes-confirm-actions') !== 'false') {
      const verb = value === 'restart' ? 'restart' : 'stop';
      if (!window.confirm(`Are you sure you want to ${verb} ${service.name}?`)) return;
    }
    control.mutate({ serviceId: service.id, data: { action: value } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetServiceQueryKey(service.id) });
        queryClient.invalidateQueries({ queryKey: getGetServiceLogsQueryKey(service.id) });
      },
    });
  };
  const canStart = service.status !== 'running' && service.status !== 'starting';
  return (
    <div className={cn('service-actions', compact && 'service-actions-compact')}>
      {service.port > 0 && service.status === 'running' && (
        <a href={`http://localhost:${service.port}`} target="_blank" rel="noreferrer" className="button button-quiet" data-testid={`button-open-${service.id}`}>
          <ExternalLink size={14} /> Open
        </a>
      )}
      {canStart ? <button className="button button-primary" disabled={busy} onClick={() => action('start')} data-testid={`button-start-${service.id}`}><Play size={14} /> Start</button> : <button className="button button-quiet" disabled={busy} onClick={() => action('stop')} data-testid={`button-stop-${service.id}`}><Square size={13} /> Stop</button>}
      <button className="button button-quiet icon-action" disabled={busy} onClick={() => action('restart')} aria-label={`Restart ${service.name}`} data-testid={`button-restart-${service.id}`}><RotateCcw size={14} /></button>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const accentStyle = { '--service-accent': service.accent || '#1e928c' } as CSSProperties;
  return (
    <article className="service-card fade-up" style={accentStyle} data-testid={`card-service-${service.id}`}>
      <div className="service-color-line" />
      <div className="service-card-top"><div className="service-glyph"><Box size={17} /></div><StatusDot status={service.status} label={service.status} /><Link href={`/services/${service.id}`} className="icon-button subtle" aria-label={`Open ${service.name}`} data-testid={`link-more-${service.id}`}><MoreHorizontal size={17} /></Link></div>
      <Link href={`/services/${service.id}`} className="service-card-link" data-testid={`link-service-${service.id}`}><h3>{service.name}</h3><p>{service.description}</p></Link>
      <div className="service-card-meta"><span className="category-tag">{categoryLabels[service.category] ?? service.category}</span><span className="port-tag font-mono-ui">:{service.port}</span><span className="version-tag">v{service.version}</span></div>
      <div className="service-card-footer"><div className="health-copy"><span className={cn('tiny-signal', statusTone(service.health))} />{service.health}<span className="footer-divider" />{service.connections} links</div><ServiceActionButtons service={service} compact /></div>
    </article>
  );
}

function ManifestModal({ manifestId, onClose }: { manifestId: string; onClose: () => void }) {
  const manifest = useGetCatalogManifest(manifestId, { query: { queryKey: getGetCatalogManifestQueryKey(manifestId) } });
  const install = useInstallService();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleInstall = () => {
    install.mutate(
      { data: { manifestId } },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCatalogQueryKey() });
          onClose();
          setLocation(`/services/${data.id}`);
        },
      }
    );
  };

  const detail: ManifestDetail | undefined = manifest.data;

  return (
    <div className="mobile-scrim" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div className="panel" style={{ width: '90%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', background: '#0e1626', color: '#e2e8f0', border: '1px solid #1e293b', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span className="eyebrow">{detail?.tier || 'Manifest Preview'}</span>
            <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '4px 0 0 0' }}>{detail?.name || manifestId}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>

        {manifest.isLoading ? (
          <div className="loading-stack"><span className="skeleton-shimmer" /><span className="skeleton-shimmer short" /></div>
        ) : detail ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{detail.description}</p>
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#cbd5e1' }}>
              <span><strong>Image:</strong> <code>{detail.image}</code></span>
              <span><strong>Default Port:</strong> <code>:{detail.defaultPort}</code></span>
              <span><strong>License:</strong> {detail.license}</span>
            </div>

            {detail.ports && detail.ports.length > 0 && (
              <div>
                <strong style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Exposed Ports</strong>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {detail.ports.map((p) => (
                    <span key={p.containerPort} style={{ background: '#1e293b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace' }}>
                      {p.label}: {p.containerPort} &rarr; {p.hostPort}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.env && detail.env.length > 0 && (
              <div>
                <strong style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Environment Configuration</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detail.env.map((e) => (
                    <div key={e.key} style={{ background: '#161f30', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <code style={{ color: e.secret ? '#f59e0b' : '#38bdf8', fontWeight: 600 }}>{e.key}</code>
                        <span style={{ color: '#64748b', marginLeft: '8px' }}>{e.description}</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>{e.secret ? '[Secret]' : e.defaultValue || 'optional'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.securityNote && (
              <div style={{ background: '#1e1b4b', borderLeft: '3px solid #6366f1', padding: '10px 14px', borderRadius: '4px', fontSize: '13px', color: '#c7d2fe' }}>
                <ShieldCheck size={15} style={{ display: 'inline', marginRight: '6px' }} />
                {detail.securityNote}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
              <button className="button button-quiet" onClick={onClose}>Cancel</button>
              <button className="button button-primary" onClick={handleInstall} disabled={install.isPending}>
                {install.isPending ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                {install.isPending ? 'Installing...' : 'Install Service to Fleet'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: '#ef4444' }}>Manifest details could not be loaded.</div>
        )}
      </div>
    </div>
  );
}

function CatalogPage() {
  const catalog = useListCatalog({ query: { queryKey: getListCatalogQueryKey() } });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [inspectId, setInspectId] = useState<string | null>(null);

  const items: CatalogItem[] = catalog.data ?? [];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = `${item.name} ${item.description} ${item.category} ${item.tier}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || item.category === filter || (filter === 'installed' && item.installed);
      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  return (
    <div className="content-wrap surface-grid">
      <PageHeader
        eyebrow="Ecosystem Catalog"
        title="Discover & deploy local AI tools."
        description="Browse open-source model runners, agent frameworks, telemetry backends, and tool servers ready to run on your machine."
        actions={
          <button className="button button-quiet" onClick={() => void catalog.refetch()} data-testid="button-refresh-catalog">
            <RefreshCw size={15} /> Refresh catalog
          </button>
        }
      />
      <div className="catalog-toolbar fade-up fade-up-delay-1">
        <label className="search-field">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Opik, oMLX, MTPLX, Understand-Anything, agents, tools..."
            aria-label="Search catalog"
            data-testid="input-search-catalog"
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="filter-group" role="group" aria-label="Catalog category filters">
          {['all', 'runtime', 'coding', 'observability', 'tool', 'automation', 'installed'].map((cat) => (
            <button
              key={cat}
              className={cn('filter-button', filter === cat && 'filter-active')}
              onClick={() => setFilter(cat)}
              data-testid={`button-filter-catalog-${cat}`}
            >
              {cat === 'all' ? 'All Catalog' : cat === 'installed' ? 'Installed Fleet' : categoryLabels[cat] ?? cat}
            </button>
          ))}
        </div>
      </div>

      <QueryState loading={catalog.isLoading} error={catalog.error} onRetry={() => void catalog.refetch()}>
        {filtered.length ? (
          <div className="service-grid">
            {filtered.map((item) => (
              <article key={item.id} className="service-card fade-up" style={{ '--service-accent': item.accent === 'amber' ? '#f59e0b' : item.accent === 'purple' ? '#a855f7' : '#1e928c' } as CSSProperties}>
                <div className="service-color-line" />
                <div className="service-card-top">
                  <div className="service-glyph"><Box size={17} /></div>
                  <span className="eyebrow" style={{ fontSize: '11px', color: '#94a3b8' }}>{item.tier}</span>
                </div>
                <div className="service-card-link">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="service-card-meta">
                  <span className="category-tag">{categoryLabels[item.category] ?? item.category}</span>
                  <span className="port-tag font-mono-ui">:{item.defaultPort}</span>
                  <span className="version-tag">{item.license}</span>
                </div>
                <div className="service-card-footer" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e293b' }}>
                  <a href={item.upstreamUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Link2 size={13} /> Repo
                  </a>
                  <button className="button button-quiet" onClick={() => setInspectId(item.id)}>
                    Inspect & Install
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state large-empty">
            <Search size={24} />
            <h3>No matching catalog entries</h3>
            <p>Try searching for Opik, oMLX, MTPLX, Understand-Anything, or resetting your filter.</p>
            {search && <button className="button button-quiet" onClick={() => setSearch('')}>Reset search</button>}
          </div>
        )}
      </QueryState>

      {inspectId && <ManifestModal manifestId={inspectId} onClose={() => setInspectId(null)} />}
    </div>
  );
}

function ActivityPanel({ overview, services }: { overview: Overview; services: Service[] }) {
  const items = services.slice(0, 3).map((service, index) => ({ title: `${service.name} is ${service.status}`, detail: service.health === 'healthy' ? 'health check passing' : 'review service configuration', time: index === 0 ? formatTime(overview.lastUpdated) : 'earlier', type: service.health === 'healthy' ? 'good' : 'warn' }));
  const activity = items.length ? items : fallbackActivity;
  return (
    <section className="panel activity-panel fade-up fade-up-delay-3" data-testid="panel-recent-activity">
      <div className="panel-heading"><div><span className="eyebrow">Recent activity</span><h2>Signal trail</h2></div><Link href="/activity" className="text-button" data-testid="link-activity-scope">Live window <ArrowRight size={14} /></Link></div>
      <div className="activity-list">{activity.map((item, index) => <div className="activity-row" key={`${item.title}-${index}`}><span className={cn('activity-icon', item.type === 'warn' ? 'activity-warn' : 'activity-good')}><Activity size={14} /></span><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{item.time}</time></div>)}</div>
      <div className="activity-foot"><span className="live-orb small signal-pulse" /> listening for new events <span className="font-mono-ui">/var/run/hermes/events</span></div>
    </section>
  );
}

function MiniTopology({ connections }: { connections: Connection[] }) {
  return (
    <section className="panel topology-panel fade-up fade-up-delay-2" data-testid="panel-connection-topology">
      <div className="panel-heading"><div><span className="eyebrow">Connection topology</span><h2>How the stack talks</h2></div><Link href="/connections" className="text-button" data-testid="link-view-connections">Inspect map <ArrowRight size={14} /></Link></div>
      {connections.length === 0 ? <div className="empty-state compact-empty"><Network size={20} /><strong>No links reported</strong><span>Connect a runner, tool, or interface to see the path here.</span></div> : <div className="topology-map">{connections.slice(0, 4).map((connection) => <div className="topology-row" key={connection.id}><div className="topology-node"><span className="node-pip pip-source" /><strong>{connection.source}</strong></div><div className="topology-line"><span>{connection.protocol}</span><ArrowRight size={14} /></div><div className="topology-node target"><span className={cn('node-pip', statusTone(connection.status))} /><strong>{connection.target}</strong></div><StatusDot status={connection.status} /></div>)}</div>}
    </section>
  );
}

function OverviewPage() {
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey(), refetchInterval: 15000 } });
  const services = useListServices({ query: { queryKey: getListServicesQueryKey(), refetchInterval: 15000 } });
  const connections = useListConnections({ query: { queryKey: getListConnectionsQueryKey() } });
  return (
    <div className="content-wrap surface-grid">
      <PageHeader eyebrow="Live overview" title="Good morning, operator." description="A quiet read on the machine, the services it carries, and the paths between them." actions={<button className="button button-quiet" onClick={() => { void overview.refetch(); void services.refetch(); }} data-testid="button-refresh-overview"><RefreshCw size={15} /> Refresh telemetry</button>} />
      <QueryState loading={overview.isLoading} error={overview.error} onRetry={() => void overview.refetch()}>{overview.data && <><SummaryRail overview={overview.data} /><div className="overview-grid"><HostCard overview={overview.data} /><ActivityPanel overview={overview.data} services={services.data ?? []} /></div></>}</QueryState>
      <div className="section-heading fade-up fade-up-delay-2"><div><span className="eyebrow">Managed fleet</span><h2>Services in the room</h2></div><Link href="/services" className="text-button" data-testid="link-all-services">Service catalog <ArrowRight size={14} /></Link></div>
      <QueryState loading={services.isLoading} error={services.error} onRetry={() => void services.refetch()}>{services.data && services.data.length > 0 ? <div className="service-grid">{services.data.slice(0, 4).map((service) => <ServiceCard service={service} key={service.id} />)}</div> : <div className="state-card" data-testid="empty-overview-services"><Box size={18} /><span>No managed services have been discovered yet.</span></div>}</QueryState>
      <QueryState loading={connections.isLoading} error={connections.error} onRetry={() => void connections.refetch()}>{connections.data && <MiniTopology connections={connections.data} />}</QueryState>
    </div>
  );
}

function ActivityPage() {
  const activity = useGetActivity({ query: { refetchInterval: 5000 } });
  
  return (
    <div className="content-wrap surface-grid">
      <PageHeader eyebrow="Live window" title="Signal trail" description="A chronologically ordered stream of system events." actions={<button className="button button-quiet" onClick={() => void activity.refetch()}><RefreshCw size={15} /> Refresh feed</button>} />
      
      <QueryState loading={activity.isLoading} error={activity.error} onRetry={() => void activity.refetch()}>
        {activity.data && (
          <div className="panel">
            <div className="panel-heading">
              <div>
                <h2>Event Feed</h2>
              </div>
            </div>
            <div className="activity-list" style={{ minHeight: '400px', maxHeight: '70vh', overflowY: 'auto' }}>
              {activity.data.length === 0 ? (
                <div className="empty-state compact-empty">
                  <Activity size={20} />
                  <strong>No recent activity</strong>
                  <span>Waiting for system events to occur.</span>
                </div>
              ) : (
                activity.data.map((item, index) => (
                  <div className="activity-row" key={`${item.id}-${index}`}>
                    <span className={cn('activity-icon', item.type === 'warn' ? 'activity-warn' : 'activity-good')}>
                      <Activity size={14} />
                    </span>
                    <div className="activity-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <time>{item.time ? formatTime(item.time) : ''}</time>
                  </div>
                ))
              )}
            </div>
            <div className="activity-foot">
              <span className="live-orb small signal-pulse" /> streaming from Docker daemon
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function ServicesPage() {
  const services = useListServices({ query: { queryKey: getListServicesQueryKey() } });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const filtered = useMemo(() => (services.data ?? []).filter((service) => {
    const matchesSearch = `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (filter === 'all' || service.category === filter || service.status === filter);
  }), [services.data, search, filter]);
  return (
    <div className="content-wrap surface-grid">
      <PageHeader eyebrow="Service catalog" title="The managed fleet." description="Start, stop, inspect, and tune every service from one deliberate surface." actions={<Link href="/catalog" className="button button-primary"><ArrowDownToLine size={15} /> Browse Ecosystem Catalog</Link>} />
      <div className="catalog-toolbar fade-up fade-up-delay-1"><label className="search-field"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services, images, categories" aria-label="Search services" data-testid="input-search-services" />{search && <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search" data-testid="button-clear-search"><X size={14} /></button>}</label><div className="filter-group" role="group" aria-label="Service filters">{['all', 'running', 'stopped', 'llm', 'coding', 'observability', 'runtime'].map((item) => <button key={item} className={cn('filter-button', filter === item && 'filter-active')} onClick={() => setFilter(item)} data-testid={`button-filter-${item}`}>{item === 'all' ? 'All services' : categoryLabels[item] ?? item}</button>)}</div></div>
      <QueryState loading={services.isLoading} error={services.error} onRetry={() => void services.refetch()}>{filtered.length ? <div className="catalog-list">{filtered.map((service) => <ServiceCard service={service} key={service.id} />)}</div> : <div className="empty-state large-empty" data-testid="empty-services"><Search size={24} /><h3>{search ? 'No matching services' : 'The fleet is clear'}</h3><p>{search ? 'Try a service name, category, or status.' : 'LocAI Console will show managed containers here after installation.'}</p>{search && <button className="button button-quiet" onClick={() => setSearch('')} data-testid="button-reset-search">Reset search</button>}</div>}</QueryState>
    </div>
  );
}

function ConfigForm({ service }: { service: Service }) {
  const update = useUpdateService();
  const queryClient = useQueryClient();
  const [port, setPort] = useState(String(service.port));
  const [image, setImage] = useState(service.image);
  const [configured, setConfigured] = useState(service.configured);
  useEffect(() => { setPort(String(service.port)); setImage(service.image); setConfigured(service.configured); }, [service.id, service.port, service.image, service.configured]);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update.mutate({ serviceId: service.id, data: { port: Number(port), image, configured } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetServiceQueryKey(service.id) }); queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() }); } });
  };
  return (
    <form className="config-form" onSubmit={save} data-testid="form-service-configuration">
      <div className="form-field"><label htmlFor="service-port">Port</label><div className="input-with-prefix"><span>:</span><input id="service-port" type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} data-testid="input-service-port" /></div><small>Local port exposed to connected tools.</small></div>
      <div className="form-field"><label htmlFor="service-image">Container image</label><input id="service-image" value={image} onChange={(event) => setImage(event.target.value)} data-testid="input-service-image" /><small>Image reference used by the host adapter.</small></div>
      <label className="toggle-field"><input type="checkbox" checked={configured} onChange={(event) => setConfigured(event.target.checked)} data-testid="input-service-configured" /><span className="toggle-visual"><i /></span><span><strong>Configuration complete</strong><small>Allow LocAI Console to include this service in safe actions.</small></span></label>
      <button className="button button-primary form-submit" type="submit" disabled={update.isPending} data-testid="button-save-service">{update.isPending ? <Loader2 size={15} className="spin" /> : <Check size={15} />} {update.isPending ? 'Saving' : 'Save configuration'}</button>
    </form>
  );
}

function LogsPanel({ serviceId }: { serviceId: string }) {
  const logs = useGetServiceLogs(serviceId, { query: { queryKey: getGetServiceLogsQueryKey(serviceId), refetchInterval: 10000 } });
  return <section className="panel logs-panel" data-testid="panel-service-logs"><div className="panel-heading"><div><span className="eyebrow">Last 40 lines</span><h2>Service output</h2></div><button className="icon-button" onClick={() => void logs.refetch()} aria-label="Refresh logs" data-testid="button-refresh-logs"><RefreshCw size={16} /></button></div><QueryState loading={logs.isLoading} error={logs.error} onRetry={() => void logs.refetch()}>{logs.data && (logs.data.length ? <div className="log-window">{logs.data.map((line) => <div className="log-line" key={line.id}><time>{formatTime(line.timestamp)}</time><span className={cn('log-stream', line.stream === 'stderr' && 'stream-error')}>{line.stream}</span><code>{line.message}</code></div>)}</div> : <div className="empty-state compact-empty"><Terminal size={19} /><strong>No recent output</strong><span>This service has not emitted lines in the current window.</span></div>)}</QueryState></section>;
}

function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const service = useGetService(id, { query: { enabled: Boolean(id), queryKey: getGetServiceQueryKey(id) } });
  return (
    <div className="content-wrap surface-grid">
      <Link href="/services" className="back-link fade-up" data-testid="link-back-services"><ArrowDownToLine size={14} className="back-icon" /> Back to service catalog</Link>
      <QueryState loading={service.isLoading} error={service.error} onRetry={() => void service.refetch()}>{service.data && <ServiceDetail service={service.data} />}</QueryState>
    </div>
  );
}

function ServiceDetail({ service }: { service: Service }) {
  const accentStyle = { '--service-accent': service.accent || '#1e928c' } as CSSProperties;
  const removeService = useRemoveService();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleRemove = () => {
    if (window.confirm(`Are you sure you want to remove ${service.name} from the fleet?`)) {
      removeService.mutate(
        { serviceId: service.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListCatalogQueryKey() });
            setLocation('/services');
          },
        }
      );
    }
  };

  return (
    <div className="detail-layout" style={accentStyle}>
      <div className="detail-main">
        <div className="detail-heading fade-up">
          <div className="detail-icon"><Box size={22} /></div>
          <div>
            <div className="eyebrow accent-eyebrow">{categoryLabels[service.category] ?? service.category}</div>
            <h1 className="page-title">{service.name}</h1>
            <p className="page-description">{service.description}</p>
          </div>
          <div className="detail-status">
            <StatusDot status={service.status} label={service.status} />
            <ServiceActionButtons service={service} />
            <button className="button button-quiet" style={{ color: '#ef4444' }} onClick={handleRemove} disabled={removeService.isPending}>
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
        <div className="detail-stats fade-up fade-up-delay-1">
          <div><span>Health</span><StatusDot status={service.health} /></div>
          <div><span>Uptime</span><strong>{service.uptime || '—'}</strong></div>
          <div><span>CPU</span><strong>{service.cpuPercent}%</strong></div>
          <div><span>Memory</span><strong>{service.memory}</strong></div>
          <div><span>Connections</span><strong>{service.connections}</strong></div>
        </div>
        <LogsPanel serviceId={service.id} />
      </div>
      <aside className="detail-side">
        <section className="panel config-panel fade-up fade-up-delay-1">
          <div className="panel-heading"><div><span className="eyebrow">Service configuration</span><h2>Runtime</h2></div><FileCog size={18} className="panel-icon" /></div>
          <ConfigForm service={service} />
        </section>
        <section className="panel image-panel fade-up fade-up-delay-2">
          <span className="eyebrow">Container source</span>
          <code>{service.image}</code>
          <div className="image-meta">
            <span><TimerReset size={14} /> {service.uptime || 'not running'}</span>
            <span><Link2 size={14} /> :{service.port}</span>
          </div>
        </section>
      </aside>
    </div>
  );
}

function ConnectionsPage() {
  const connections = useListConnections({ query: { queryKey: getListConnectionsQueryKey() } });
  const [selected, setSelected] = useState<string | null>(null);
  const selectedConnection = connections.data?.find((item) => item.id === selected) ?? connections.data?.[0];
  return (
    <div className="content-wrap surface-grid">
      <PageHeader eyebrow="Connection map" title="Follow the signal." description="Inspect how runners, developer tools, automation, and interfaces pass work through your machine." actions={<button className="button button-quiet" onClick={() => void connections.refetch()} data-testid="button-refresh-connections"><RefreshCw size={15} /> Refresh map</button>} />
      <QueryState loading={connections.isLoading} error={connections.error} onRetry={() => void connections.refetch()}>{connections.data && (connections.data.length ? <div className="connections-layout"><section className="panel connection-map-panel"><div className="panel-heading"><div><span className="eyebrow">Observed paths</span><h2>{connections.data.length} active route{connections.data.length === 1 ? '' : 's'}</h2></div><span className="map-legend"><span className="legend-line" /> data path</span></div><div className="connection-list">{connections.data.map((connection) => <button className={cn('connection-row', selectedConnection?.id === connection.id && 'connection-row-active')} onClick={() => setSelected(connection.id)} key={connection.id} data-testid={`button-connection-${connection.id}`}><div className="connection-endpoint"><span className="endpoint-badge">{connection.source.slice(0, 1)}</span><strong>{connection.source}</strong></div><div className="connection-route"><span>{connection.protocol}</span><div className="route-rule"><i /></div><ArrowRight size={15} /></div><div className="connection-endpoint target-endpoint"><span className={cn('endpoint-badge target', statusTone(connection.status))}>{connection.target.slice(0, 1)}</span><strong>{connection.target}</strong></div><StatusDot status={connection.status} /></button>)}</div></section><aside className="panel connection-inspector"><span className="eyebrow">Route inspector</span>{selectedConnection ? <><div className="inspector-route"><span>{selectedConnection.source}</span><ArrowRight size={18} /><span>{selectedConnection.target}</span></div><StatusDot status={selectedConnection.status} label={selectedConnection.status} /><div className="inspector-details"><div><span>Protocol</span><strong className="font-mono-ui">{selectedConnection.protocol}</strong></div><div><span>Detail</span><strong>{selectedConnection.detail}</strong></div><div><span>Connection ID</span><strong className="font-mono-ui">{selectedConnection.id}</strong></div></div><button className="button button-quiet full-width" onClick={() => window.alert('Connection diagnostics are available through the host adapter.')} data-testid="button-test-connection"><Zap size={14} /> Run diagnostic</button></> : <div className="empty-state compact-empty"><Link2 size={20} /><strong>Select a route</strong><span>Choose a path to inspect its protocol and current state.</span></div>}</aside></div> : <div className="empty-state large-empty"><Network size={25} /><h3>No connections yet</h3><p>When LocAI Console detects a compatible runner or interface, its path will appear here.</p><Link href="/services" className="button button-primary" data-testid="link-browse-services">Browse services <ArrowRight size={14} /></Link></div>)}</QueryState>
    </div>
  );
}

function SettingsPage() {
  const overview = useGetOverview({ query: { queryKey: getGetOverviewQueryKey() } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey() } });
  const [saved, setSaved] = useState(false);
  const [adapter, setAdapter] = useState(() => localStorage.getItem('hermes-adapter') ?? 'LocAI local socket');
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('hermes-endpoint') ?? 'unix:///var/run/docker.sock');
  const [confirmActions, setConfirmActions] = useState(() => localStorage.getItem('hermes-confirm-actions') !== 'false');
  const [refresh, setRefresh] = useState(() => localStorage.getItem('hermes-refresh') ?? '15');
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); localStorage.setItem('hermes-adapter', adapter); localStorage.setItem('hermes-endpoint', endpoint); localStorage.setItem('hermes-confirm-actions', String(confirmActions)); localStorage.setItem('hermes-refresh', refresh); setSaved(true); window.setTimeout(() => setSaved(false), 2400); };
  return <div className="content-wrap surface-grid"><PageHeader eyebrow="Control plane settings" title="Set the operating rhythm." description="These preferences stay on this browser. Runtime facts still come from the local host adapter." actions={<button className="button button-quiet" onClick={() => void health.refetch()} data-testid="button-test-adapter"><Activity size={15} /> Test adapter</button>} /><form className="settings-layout" onSubmit={save} data-testid="form-settings"><div className="settings-main"><section className="panel settings-section fade-up fade-up-delay-1"><div className="settings-section-heading"><div className="settings-index">01</div><div><span className="eyebrow">Host adapter</span><h2>Where LocAI listens</h2><p>Choose the local bridge that reports machine and service state.</p></div></div><div className="settings-fields"><div className="form-field"><label htmlFor="adapter-name">Adapter label</label><input id="adapter-name" value={adapter} onChange={(event) => setAdapter(event.target.value)} data-testid="input-adapter-label" /></div><div className="form-field"><label htmlFor="docker-endpoint">Docker endpoint</label><input id="docker-endpoint" className="font-mono-ui" value={endpoint} onChange={(event) => setEndpoint(event.target.value)} data-testid="input-docker-endpoint" /></div></div><div className="host-preview"><div className="preview-icon"><HardDrive size={16} /></div><div><strong>{overview.data?.host.name ?? 'Host discovery pending'}</strong><span>{overview.data ? `${overview.data.host.os} · ${overview.data.host.architecture}` : 'The host will be shown after the next successful read.'}</span></div><StatusDot status={health.isError ? 'offline' : health.isLoading ? 'pending' : 'connected'} label={health.isLoading ? 'checking' : health.isError ? 'offline' : 'reachable'} /></div></section><section className="panel settings-section fade-up fade-up-delay-2"><div className="settings-section-heading"><div className="settings-index">02</div><div><span className="eyebrow">Safety defaults</span><h2>Make actions predictable</h2><p>Keep lifecycle controls explicit when working close to the machine.</p></div></div><label className="toggle-field larger"><input type="checkbox" checked={confirmActions} onChange={(event) => setConfirmActions(event.target.checked)} data-testid="input-confirm-actions" /><span className="toggle-visual"><i /></span><span><strong>Confirm destructive actions</strong><small>Ask before stopping or restarting a running service.</small></span></label><div className="form-field narrow-field"><label htmlFor="refresh-rate">Telemetry refresh</label><select id="refresh-rate" value={refresh} onChange={(event) => setRefresh(event.target.value)} data-testid="select-refresh-rate"><option value="5">Every 5 seconds</option><option value="15">Every 15 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option></select></div></section></div><aside className="settings-aside"><div className="settings-note fade-up fade-up-delay-2"><div className="note-icon"><Info size={16} /></div><div><strong>Local-first by design</strong><p>Settings are stored in this browser. LocAI Console never needs a cloud account to operate your stack.</p></div></div><div className="settings-status fade-up fade-up-delay-3"><span className="eyebrow">Current posture</span><div className="posture-row"><ShieldCheck size={18} /><strong>{confirmActions ? 'Guarded' : 'Fast lane'}</strong></div><span>{confirmActions ? 'Actions remain deliberate.' : 'Actions run immediately.'}</span></div><button className="button button-primary full-width save-settings" type="submit" data-testid="button-save-settings">{saved ? <><Check size={15} /> Saved locally</> : <><Check size={15} /> Save preferences</>}</button></aside></form></div>;
}

function Router() {
  return (
    <ErrorBoundary>
      <AppShell>
        <Switch>
          <Route path="/" component={OverviewPage} />
          <Route path="/services" component={ServicesPage} />
          <Route path="/services/:id" component={ServiceDetailPage} />
          <Route path="/activity" component={ActivityPage} />
          <Route path="/catalog" component={CatalogPage} />
          <Route path="/connections" component={ConnectionsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </AppShell>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;