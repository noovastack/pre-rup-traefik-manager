/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { Activity, Save, CheckCircle2, Server, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type TelemetryConfig = {
  tracing: {
    openTelemetry: { enabled: boolean; address: string };
    zipkin: { enabled: boolean; httpEndpoint: string };
  };
  metrics: {
    prometheus: { enabled: boolean; addRoutersLabels: boolean };
    datadog: { enabled: boolean; address: string };
  };
};

export default function ObservabilityPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const configMapName = 'traefik-telemetry';

  const { data: config = {}, isLoading } = useQuery<unknown>({
    queryKey: ['observability', namespace],
    queryFn: () => k8sApi.getTelemetryConfig(namespace, configMapName),
  });

  const mutation = useMutation({
    mutationFn: (newConfig: TelemetryConfig) => k8sApi.updateTelemetryConfig(namespace, configMapName, newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['observability', namespace] });
    },
  });

  // Local state for the form edits
  const [edited, setEdited] = useState<TelemetryConfig | null>(null);

  const serverFormData: TelemetryConfig = {
    tracing: {
      openTelemetry: {
        enabled: Boolean((config as any)?.tracing?.openTelemetry?.enabled),
        address: String((config as any)?.tracing?.openTelemetry?.address ?? ''),
      },
      zipkin: {
        enabled: Boolean((config as any)?.tracing?.zipkin?.enabled),
        httpEndpoint: String((config as any)?.tracing?.zipkin?.httpEndpoint ?? ''),
      }
    },
    metrics: {
      prometheus: {
        enabled: Boolean((config as any)?.metrics?.prometheus?.enabled),
        addRoutersLabels: (config as any)?.metrics?.prometheus?.addRoutersLabels ?? true,
      },
      datadog: {
        enabled: Boolean((config as any)?.metrics?.datadog?.enabled),
        address: String((config as any)?.metrics?.datadog?.address ?? ''),
      }
    }
  };

  const formData = edited ?? serverFormData;

  // Helper to start an edit
  const setFormData = (updater: (prev: TelemetryConfig) => TelemetryConfig) => {
    setEdited(prev => updater(prev ?? serverFormData));
  };

  const handleSave = () => {
    mutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading Observability Configuration…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1 flex items-center gap-2">
            <Activity className="h-6 w-6 text-rose-400" />
            Telemetry & Observability
          </h2>
          <p className="text-sm text-zinc-400">Configure global metrics and distributed tracing for Traefik in namespace: <span className="text-rose-400 font-mono">{namespace}</span></p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={mutation.isPending}
          className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 transition-colors border-0"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">Saving…</span>
          ) : mutation.isSuccess ? (
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Saved</span>
          ) : (
            <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Apply Changes</span>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ── Tracing Section ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-800 pb-2">Distributed Tracing</h3>
          
          {/* OpenTelemetry */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors focus-within:border-rose-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Globe2 className="h-5 w-5 text-indigo-400" />
                <div>
                  <h4 className="font-semibold text-zinc-100">OpenTelemetry</h4>
                  <p className="text-xs text-zinc-500">OTLP gRPC Exporter</p>
                </div>
              </div>
              <Switch 
                checked={formData.tracing.openTelemetry.enabled}
                onCheckedChange={(v) => setFormData(d => ({...d, tracing: {...d.tracing, openTelemetry: {...d.tracing.openTelemetry, enabled: v}}}))}
              />
            </div>
            
            {formData.tracing.openTelemetry.enabled && (
              <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <div className="grid gap-1.5">
                  <Label className="text-zinc-400 text-xs">GRPC Endpoint Address</Label>
                  <Input autoComplete="off" spellCheck={false} 
                    placeholder="localhost:4317"
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300"
                    value={formData.tracing.openTelemetry.address}
                    onChange={(e) => setFormData(d => ({...d, tracing: {...d.tracing, openTelemetry: {...d.tracing.openTelemetry, address: e.target.value}}}))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Zipkin */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors focus-within:border-orange-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-orange-400" />
                <div>
                  <h4 className="font-semibold text-zinc-100">Zipkin</h4>
                  <p className="text-xs text-zinc-500">B3 Propagation</p>
                </div>
              </div>
              <Switch 
                checked={formData.tracing.zipkin.enabled}
                onCheckedChange={(v) => setFormData(d => ({...d, tracing: {...d.tracing, zipkin: {...d.tracing.zipkin, enabled: v}}}))}
              />
            </div>
            
            {formData.tracing.zipkin.enabled && (
              <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <div className="grid gap-1.5">
                  <Label className="text-zinc-400 text-xs">HTTP Endpoint</Label>
                  <Input autoComplete="off" spellCheck={false} 
                    placeholder="http://zipkin:9411/api/v2/spans"
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300"
                    value={formData.tracing.zipkin.httpEndpoint}
                    onChange={(e) => setFormData(d => ({...d, tracing: {...d.tracing, zipkin: {...d.tracing.zipkin, httpEndpoint: e.target.value}}}))}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Metrics Section ─────────────────────────────────────────────────── */}
        <div className="space-y-6">
           <h3 className="text-lg font-medium text-zinc-300 border-b border-zinc-800 pb-2">Metrics</h3>

          {/* Prometheus */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors focus-within:border-rose-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-rose-400" />
                <div>
                  <h4 className="font-semibold text-zinc-100">Prometheus</h4>
                  <p className="text-xs text-zinc-500">Time-series data scraping</p>
                </div>
              </div>
              <Switch 
                checked={formData.metrics.prometheus.enabled}
                onCheckedChange={(v) => setFormData(d => ({...d, metrics: {...d.metrics, prometheus: {...d.metrics.prometheus, enabled: v}}}))}
              />
            </div>
            
            {formData.metrics.prometheus.enabled && (
              <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-400 text-sm">Add Router Labels</Label>
                  <Switch 
                    checked={formData.metrics.prometheus.addRoutersLabels}
                    onCheckedChange={(v) => setFormData(d => ({...d, metrics: {...d.metrics, prometheus: {...d.metrics.prometheus, addRoutersLabels: v}}}))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Datadog */}
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors focus-within:border-purple-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-purple-400" />
                <div>
                  <h4 className="font-semibold text-zinc-100">Datadog</h4>
                  <p className="text-xs text-zinc-500">Agent address configuration</p>
                </div>
              </div>
              <Switch 
                checked={formData.metrics.datadog.enabled}
                onCheckedChange={(v) => setFormData(d => ({...d, metrics: {...d.metrics, datadog: {...d.metrics.datadog, enabled: v}}}))}
              />
            </div>
            
            {formData.metrics.datadog.enabled && (
              <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                <div className="grid gap-1.5">
                  <Label className="text-zinc-400 text-xs">Agent Address</Label>
                  <Input autoComplete="off" spellCheck={false} 
                    placeholder="localhost:8125"
                    className="bg-zinc-950/50 border-zinc-800 text-zinc-300"
                    value={formData.metrics.datadog.address}
                    onChange={(e) => setFormData(d => ({...d, metrics: {...d.metrics, datadog: {...d.metrics.datadog, address: e.target.value}}}))}
                  />
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
