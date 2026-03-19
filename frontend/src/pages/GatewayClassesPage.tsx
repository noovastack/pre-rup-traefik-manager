import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Globe, Plus, Trash2, Edit, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreateGatewayClassDialog } from '@/components/CreateGatewayClassDialog';
import type { GatewayClass } from '@/types';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export default function GatewayClassesPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [yamlGatewayClass, setYamlGatewayClass] = useState<GatewayClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['gatewayclasses'],
    queryFn: () => k8sApi.getGatewayClasses(),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteGatewayClass(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gatewayclasses'] });
    },
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading GatewayClasses…</div>;
  }

  if (caps && !caps.gatewayApi) {
    return <CRDNotInstalled crdGroup="Gateway API" apiGroup="gateway.networking.k8s.io" description="Gateway API controller classes" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">GatewayClasses</h2>
          <p className="text-sm text-zinc-400">Cluster-scoped GatewayClasses managed by operators.</p>
        </div>
        <Button 
          onClick={() => { setEditingClass(null); setCreateOpen(true); }}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-0 transition-colors font-medium"
        >
          <Plus className="mr-2 h-4 w-4" /> Add GatewayClass
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {classes.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <Globe className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No GatewayClasses found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">GatewayClasses are defined by your infrastructure provider or ingress controller installation.</p>
          </div>
        ) : (
          classes.map((gc: GatewayClass) => (
            <div key={gc.metadata.name} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-100 text-lg">{gc.metadata.name}</span>
                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">
                    Cluster
                  </span>
                </div>
                <div className="text-sm text-zinc-400 gap-4 mt-1">
                  Controller: <span className="font-mono text-emerald-400">{gc.spec.controllerName}</span>
                </div>
                {gc.spec.description && (
                  <div className="text-sm text-zinc-500 mt-2 italic">
                    {gc.spec.description}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setYamlGatewayClass(gc)}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Code className="h-4 w-4 mr-2" /> YAML
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => { setEditingClass(gc); setCreateOpen(true); }}
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border-0 transition-colors transition-opacity opacity-0 group-hover:opacity-100"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => { setDeleteTarget(gc.metadata.name); }}
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

      <CreateGatewayClassDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        editClass={editingClass}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="GatewayClass"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlGatewayClass} onOpenChange={(open) => !open && setYamlGatewayClass(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlGatewayClass?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlGatewayClass ? yaml.dump(yamlGatewayClass, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
