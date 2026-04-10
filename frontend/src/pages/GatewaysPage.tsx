/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Globe, Server, Plus, Trash2, Edit, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreateGatewayDialog } from '@/components/CreateGatewayDialog';
import type { Gateway } from '@/types';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export default function GatewaysPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<any>(null);
  const [yamlGateway, setYamlGateway] = useState<Gateway | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data: gateways = [], isLoading } = useQuery({
    queryKey: ['gateways', namespace],
    queryFn: () => k8sApi.getGateways(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteGateway(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gateways', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading Gateways…</div>;
  }

  if (caps && !caps.gatewayApi) {
    return <CRDNotInstalled crdGroup="Gateway API" apiGroup="gateway.networking.k8s.io" description="Gateway API load balancers" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">Gateways</h2>
          <p className="text-sm text-zinc-400">Gateway API load balancers for namespace: <span className="text-blue-400 font-mono">{namespace}</span></p>
        </div>
        <Button 
          onClick={() => { setEditingGateway(null); setCreateOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0 transition-colors font-medium"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Gateway
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {gateways.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <Globe className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No Gateways found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">There are no Gateways defined in the {namespace} namespace.</p>
          </div>
        ) : (
          gateways.map((gw: Gateway) => (
            <div key={gw.metadata.name} className="flex flex-col gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-zinc-100 text-lg">{gw.metadata.name}</span>
                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                  {gw.spec.gatewayClassName}
                </span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {gw.spec.listeners && gw.spec.listeners.map((l, i) => (
                   <div key={i} className="flex items-center gap-3 text-sm text-zinc-400 bg-black/20 p-2 rounded border border-zinc-800">
                     <Server className="h-4 w-4 text-purple-400" />
                     <span className="font-medium text-zinc-300">{l.name}</span>
                     <span>|</span>
                     <span className="font-mono text-emerald-400">{l.protocol}:{l.port}</span>
                     {l.hostname && (
                       <>
                         <span>|</span>
                         <span className="font-mono text-orange-300">{l.hostname}</span>
                       </>
                     )}
                   </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setYamlGateway(gw)}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Code className="h-4 w-4 mr-2" /> YAML
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => { setEditingGateway(gw); setCreateOpen(true); }}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => { setDeleteTarget(gw.metadata.name); }}
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

      <CreateGatewayDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        namespace={namespace}
        editGateway={editingGateway}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="Gateway"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlGateway} onOpenChange={(open) => !open && setYamlGateway(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlGateway?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlGateway ? yaml.dump(yamlGateway, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
