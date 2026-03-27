import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ShieldAlert, Key, Zap, Scissors, Edit2 } from 'lucide-react';
import { CreateMiddlewareDialog } from '@/components/CreateMiddlewareDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export function MiddlewaresPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMw, setEditingMw] = useState<any>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: middlewares = [], isLoading } = useQuery({
    queryKey: ['middlewares', namespace],
    queryFn: () => k8sApi.getMiddlewares(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteMiddleware(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['middlewares', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading Middlewares…</div>;
  }

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="HTTP traffic processing rules" />;
  }

  // Helper to determine what type of middleware it is
  const getMwDetails = (mw: any) => {
    if (mw.spec.stripPrefix) {
      return { type: 'StripPrefix', icon: Scissors, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', desc: `Prefixes: ${mw.spec.stripPrefix.prefixes.join(', ')}` };
    }
    if (mw.spec.basicAuth) {
      return { type: 'BasicAuth', icon: Key, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', desc: `Secret Name: ${mw.spec.basicAuth.secret}` };
    }
    if (mw.spec.rateLimit) {
      return { type: 'RateLimit', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: `Average: ${mw.spec.rateLimit.average}, Burst: ${mw.spec.rateLimit.burst}` };
    }
    return { type: 'Unknown', icon: ShieldAlert, color: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', desc: 'Custom Configuration' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">Middlewares</h2>
          <p className="text-sm text-zinc-400">Manage proxy traffic rules for namespace: <span className="text-blue-400 font-mono">{namespace}</span></p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-colors transition-opacity border-0 disabled:opacity-50">
          <Plus className="mr-2 h-4 w-4" />
          Create Middleware
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {middlewares.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <ShieldAlert className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No middlewares found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">There are no Traefik Middlewares defined in the {namespace} namespace.</p>
          </div>
        ) : (
          middlewares.map((mw: any) => {
            const details = getMwDetails(mw);
            return (
              <div key={mw.metadata.name} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors transition-opacity hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${details.bg} ${details.border} border`}>
                    <details.icon className={`h-5 w-5 ${details.color}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-100 text-lg">{mw.metadata.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${details.bg} ${details.color} ${details.border} border`}>
                        {details.type}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5">{details.desc}</p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    onClick={() => {
                      setEditingMw(mw);
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
                      setDeleteTarget(mw.metadata.name);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <CreateMiddlewareDialog
        open={createOpen}
        onOpenChange={(val) => {
          setCreateOpen(val);
          if (!val) setEditingMw(undefined);
        }}
        namespace={namespace}
        editMw={editingMw}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="Middleware"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
