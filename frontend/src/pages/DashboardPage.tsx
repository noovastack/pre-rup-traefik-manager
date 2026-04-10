import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { Activity, Globe, Cpu, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';
import { ClusterHealthCard } from '@/components/ClusterHealthCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DashboardPage({ namespace }: { namespace: string }) {
  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['ingressroutes', namespace],
    queryFn: () => k8sApi.getIngressRoutes(namespace),
  });

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services', namespace],
    queryFn: () => k8sApi.getServices(namespace),
  });

  const { data: middlewares = [], isLoading: loadingMws } = useQuery({
    queryKey: ['middlewares', namespace],
    queryFn: () => k8sApi.getMiddlewares(namespace),
  });

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics', namespace],
    queryFn: () => k8sApi.getMetrics(namespace),
    refetchInterval: 10000,
  });

  // Historical time-series state (max 30 points = 5 minutes at 10s intervals)
  const [history, setHistory] = useState<unknown[]>([]);

  useEffect(() => {
    if (metrics) {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const successData = Object.entries(metrics.httpCodes || {})
        .filter(([code]) => code.startsWith('2'))
        .reduce((sum, [, count]) => sum + (count as number), 0);
        
      const clientErrData = Object.entries(metrics.httpCodes || {})
        .filter(([code]) => code.startsWith('4'))
        .reduce((sum, [, count]) => sum + (count as number), 0);

      const serverErrData = Object.entries(metrics.httpCodes || {})
        .filter(([code]) => code.startsWith('5'))
        .reduce((sum, [, count]) => sum + (count as number), 0);

      const newDataPoint = {
        time: timeLabel,
        total: metrics.totalRequests || 0,
        success: successData,
        clientErrs: clientErrData,
        serverErrs: serverErrData,
      };

      queueMicrotask(() => {
        setHistory(prev => {
          const newHistory = [...prev, newDataPoint];
          if (newHistory.length > 30) {
            return newHistory.slice(newHistory.length - 30);
          }
          return newHistory;
        });
      });
    }
  }, [metrics]);

  const stats = [
    {
      title: 'Active Connections',
      value: loadingMetrics ? '…' : (metrics?.activeConnections || 0).toLocaleString(),
      description: 'Current open connections',
      icon: Activity,
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: 'Active IngressRoutes',
      value: loadingRoutes ? '…' : (routes || []).length.toString(),
      description: 'Routes in this namespace',
      icon: Globe,
      trend: routes.length > 0 ? `${routes.length} active` : 'None configured',
      trendUp: routes.length > 0,
    },
    {
      title: 'Discovered Services',
      value: loadingServices ? '…' : (services || []).length.toString(),
      description: 'Available routing targets',
      icon: Cpu,
      trend: services.length > 0 ? `${services.length} discovered` : 'No services',
      trendUp: services.length > 0,
    },
    {
      title: 'Configured Middlewares',
      value: loadingMws ? '…' : (middlewares || []).length.toString(),
      description: 'Traffic processing rules',
      icon: ShieldAlert,
      trend: middlewares.length > 0 ? `${middlewares.length} active` : 'None configured',
      trendUp: middlewares.length > 0,
    },
  ];

  const chartConfig = {
    total: {
      label: "Total requests",
      color: "hsl(142, 71%, 45%)",
    },
    success: {
      label: "2xx Success",
      color: "hsl(217, 91%, 60%)",
    },
    clientErrs: {
      label: "4xx Client",
      color: "hsl(25, 95%, 53%)",
    },
    serverErrs: {
      label: "5xx Server",
      color: "hsl(0, 84%, 60%)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cluster Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Overview of Traefik resources in the <span className="font-mono text-blue-400">{namespace}</span> namespace.
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                {stat.trendUp ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                )}
                <span>{stat.trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Section ─────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Total Requests</CardTitle>
                <CardDescription>
                  {loadingMetrics ? 'Loading…' : (
                    <>
                      <span className="text-2xl font-bold text-foreground">
                        {(metrics?.totalRequests || 0) >= 1000
                          ? `${((metrics?.totalRequests || 0) / 1000).toFixed(1)}K`
                          : metrics?.totalRequests || 0}
                      </span>
                      {' '}requests recorded
                    </>
                  )}
                </CardDescription>
              </div>
              <Tabs defaultValue="5m" className="ml-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="5m" className="text-xs px-2.5">Last 5 min</TabsTrigger>
                  <TabsTrigger value="live" className="text-xs px-2.5">Live</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="h-[250px]">
            {history.length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Gathering traffic history…
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <AreaChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval="preserveStartEnd"
                    minTickGap={40}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={2}
                    fill="url(#fillTotal)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="success"
                    stroke="var(--color-success)"
                    strokeWidth={2}
                    fill="url(#fillSuccess)"
                    dot={false}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Right Column: Cluster Health + Services ───────────── */}
        <div className="md:col-span-3 space-y-4">
          <ClusterHealthCard />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Discovered Services</CardTitle>
              <CardDescription>Available routing targets in <span className="font-mono">{namespace}</span></CardDescription>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="text-xs text-muted-foreground animate-pulse">Loading services…</div>
              ) : !(services || []).length ? (
                <div className="text-xs text-muted-foreground">No services found in {namespace}.</div>
              ) : (
                <div className="space-y-2">
                  {(services || []).slice(0, 5).map((svc: { name: string; clusterIP?: string }) => (
                    <div key={svc.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-sm font-medium">{svc.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {svc.clusterIP || 'None'}
                      </span>
                    </div>
                  ))}
                  {(services || []).length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{(services || []).length - 5} more services
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
