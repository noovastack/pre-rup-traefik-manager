import { useQuery } from '@tanstack/react-query';
import { clusterApi } from '@/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Server, Cpu, Box, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function ClusterHealthCard() {
  const activeCluster = localStorage.getItem('tm_cluster') || '';

  const { data: health, isLoading, isError } = useQuery({
    queryKey: ['clusterHealth', activeCluster],
    queryFn: clusterApi.getClusterHealth,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-2/3 bg-muted" />
          <Skeleton className="h-4 w-1/2 bg-muted" />
          <Skeleton className="h-4 w-3/4 bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !health) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Unable to fetch cluster health
          </div>
        </CardContent>
      </Card>
    );
  }

  const allNodesReady = health.nodes.ready === health.nodes.total;
  const failedPods = health.pods.failed;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Cluster Health</CardTitle>
            <CardDescription className="mt-1">
              <span className="text-lg font-bold text-foreground">{health.kubernetesVersion}</span>
              {' '}
              <span className="text-xs text-muted-foreground">({health.platform})</span>
            </CardDescription>
          </div>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${allNodesReady ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
            <Server className={`h-4 w-4 ${allNodesReady ? 'text-emerald-500' : 'text-amber-500'}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Nodes */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Nodes</span>
          </div>
          <div className="flex items-center gap-1.5">
            {allNodesReady ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-sm font-medium font-mono text-foreground">
              {health.nodes.ready}/{health.nodes.total} ready
            </span>
          </div>
        </div>

        {/* Pods */}
        <div className="p-2.5 rounded-lg bg-muted/50 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pods</span>
            </div>
            <span className="text-sm font-medium font-mono text-foreground">{health.pods.total} total</span>
          </div>
          <div className="flex gap-3 text-xs font-mono">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-muted-foreground">{health.pods.running} running</span>
            </div>
            {health.pods.pending > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500">{health.pods.pending} pending</span>
              </div>
            )}
            {failedPods > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">{failedPods} failed</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
