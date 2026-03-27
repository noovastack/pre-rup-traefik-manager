import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Globe, Lock, Edit2 } from 'lucide-react';
import type { IngressRoute } from '@/types';
import { CreateIngressRouteDialog } from '@/components/CreateIngressRouteDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export function IngressRoutesPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<IngressRoute | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['ingressroutes', namespace],
    queryFn: () => k8sApi.getIngressRoutes(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteIngressRoute(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingressroutes', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading IngressRoutes…</div>;
  }

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="HTTP and HTTPS routing rules" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">IngressRoutes</h2>
          <p className="text-sm text-zinc-400">Manage proxy routes and services for namespace: <span className="text-blue-400 font-mono">{namespace}</span></p>
        </div>
        <Button onClick={() => { setEditingRoute(undefined); setCreateOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-colors transition-opacity border-0">
          <Plus className="mr-2 h-4 w-4" />
          Create Route
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {routes.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <Globe className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No routes found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">There are no Traefik IngressRoutes defined in the {namespace} namespace. Create one to start routing traffic to your services.</p>
          </div>
        ) : (
          routes.map((route: IngressRoute) => (
            <div key={route.metadata.name} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors transition-opacity hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-100 text-lg">{route.metadata.name}</span>
                  {route.spec.tls ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <Lock className="mr-1 h-3 w-3" /> HTTPS
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-500/20">
                      HTTP
                    </span>
                  )}
                </div>
                <div className="flex items-center text-sm text-zinc-400 gap-4 mt-1">
                  {route.spec.routes.map((r, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono bg-zinc-950 px-2 py-0.5 rounded text-blue-300 border border-black/50">{r.match}</span>
                        <span className="text-zinc-600">→</span>
                        {r.services.map(s => (
                          <span key={s.name} className="font-mono bg-zinc-950 px-2 py-0.5 rounded text-purple-300 border border-black/50">
                            {s.name}:{s.port}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  onClick={() => {
                    setEditingRoute(route);
                    setCreateOpen(true);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-950/50"
                  onClick={() => {
                    setDeleteTarget(route.metadata.name);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateIngressRouteDialog
        open={createOpen}
        onOpenChange={(val) => {
          setCreateOpen(val);
          if (!val) setEditingRoute(undefined);
        }}
        namespace={namespace}
        editRoute={editingRoute}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="IngressRoute"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
