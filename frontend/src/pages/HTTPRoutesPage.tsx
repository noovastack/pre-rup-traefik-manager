import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Route as RouteIcon, Network, Plus, Trash2, Edit, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreateHTTPRouteDialog } from '@/components/CreateHTTPRouteDialog';
import type { HTTPRoute } from '@/types';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export default function HTTPRoutesPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<unknown>(null);
  const [yamlRoute, setYamlRoute] = useState<HTTPRoute | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data: routes = [], isLoading } = useQuery({
    queryKey: ['httproutes', namespace],
    queryFn: () => k8sApi.getHTTPRoutes(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteHTTPRoute(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['httproutes', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading HTTPRoutes…</div>;
  }

  if (caps && !caps.gatewayApi) {
    return <CRDNotInstalled crdGroup="Gateway API" apiGroup="gateway.networking.k8s.io" description="Gateway API HTTP routing rules" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">HTTPRoutes</h2>
          <p className="text-sm text-zinc-400">Gateway API routing rules for namespace: <span className="text-blue-400 font-mono">{namespace}</span></p>
        </div>
        <Button 
          onClick={() => { setEditingRoute(null); setCreateOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0 transition-colors font-medium"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Route
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {routes.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <RouteIcon className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No HTTPRoutes found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">There are no HTTPRoutes defined in the {namespace} namespace. Connect them to a Gateway to route traffic.</p>
          </div>
        ) : (
          routes.map((hr: HTTPRoute) => (
            <div key={hr.metadata.name} className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-100 text-lg">{hr.metadata.name}</span>
                </div>
              </div>

              {hr.spec.hostnames && hr.spec.hostnames.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold uppercase text-zinc-500">Hosts:</span>
                  {hr.spec.hostnames.map(h => (
                    <span key={h} className="font-mono bg-zinc-950 px-2 py-0.5 rounded text-orange-300 border border-black/50 text-sm">{h}</span>
                  ))}
                </div>
              )}

              {hr.spec.parentRefs && hr.spec.parentRefs.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold uppercase text-zinc-500">Gateways:</span>
                  {hr.spec.parentRefs.map((p, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                      {p.namespace ? `${p.namespace}/` : ''}{p.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-3 p-3 bg-black/20 rounded-lg border border-zinc-800/50">
                <div className="text-xs font-semibold uppercase text-zinc-500 mb-1">Routing Rules</div>
                {hr.spec.rules && hr.spec.rules.map((rule, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-2 border border-zinc-800/80 rounded bg-zinc-950/50">
                    <div className="flex items-center gap-2">
                      <Network className="h-4 w-4 text-zinc-500" />
                      {rule.matches ? rule.matches.map((m, mIdx) => (
                        <span key={mIdx} className="font-mono bg-zinc-900 px-2 py-0.5 rounded text-blue-300 text-sm">
                          {m.path?.type === 'PathPrefix' ? 'PathPrefix' : m.path?.type}: {m.path?.value}
                        </span>
                      )) : <span className="font-mono bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 text-sm">Catch All (*)</span>}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-6 text-sm text-zinc-400">
                      <span>→</span>
                      {rule.backendRefs?.map((b, bIdx) => (
                        <span key={bIdx} className="font-mono bg-indigo-950/40 px-2 py-0.5 rounded text-indigo-300 border border-indigo-500/20">
                          {b.name}:{b.port} {b.weight ? `(w:${b.weight})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setYamlRoute(hr)}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Code className="h-4 w-4 mr-2" /> YAML
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => { setEditingRoute(hr); setCreateOpen(true); }}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => { setDeleteTarget(hr.metadata.name); }}
                  disabled={deleteMutation.isPending}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateHTTPRouteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        namespace={namespace}
        editRoute={editingRoute}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="HTTPRoute"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlRoute} onOpenChange={(open) => !open && setYamlRoute(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlRoute?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlRoute ? yaml.dump(yamlRoute, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
