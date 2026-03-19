import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi, capabilitiesApi } from '@/api';
import { Button } from '@/components/ui/button';
import yaml from 'js-yaml';
import { Plus, Trash2, Edit2, ShieldCheck, LockKeyhole, Code } from 'lucide-react';
import { CreateTLSOptionDialog } from '@/components/CreateTLSOptionDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

export function TLSOptionsPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<any>(undefined);
  const [yamlOption, setYamlOption] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['tlsoptions', namespace],
    queryFn: () => k8sApi.getTlsOptions(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteTlsOption(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tlsoptions', namespace] });
    },
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) {
    return <div className="text-zinc-500 animate-pulse">Loading TLS Options…</div>;
  }

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="TLS security policies" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">TLS Options</h2>
          <p className="text-sm text-zinc-400">Manage minimum versions and cipher suites for <span className="text-blue-400 font-mono">{namespace}</span></p>
        </div>
        <Button onClick={() => { setEditingOption(undefined); setCreateOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-colors transition-opacity border-0 disabled:opacity-50">
          <Plus className="mr-2 h-4 w-4" />
          Create TLS Option
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {options.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center backdrop-blur-sm">
            <ShieldCheck className="mx-auto h-12 w-12 text-zinc-600 mb-4 opacity-50 float-icon" />
            <h3 className="text-lg font-medium text-white mb-2">No TLS Options found</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">Enhance security by defining minimum TLS versions and cipher suites.</p>
          </div>
        ) : (
          options.map((opt: any) => {
            const minVersion = opt.spec.minVersion || 'Default';
            return (
              <div key={opt.metadata.name} className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 transition-colors transition-opacity hover:bg-zinc-800/40 hover:border-zinc-700/60 group backdrop-blur-md">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-teal-500/10 border-teal-500/20 border`}>
                    <LockKeyhole className={`h-5 w-5 text-teal-400`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-zinc-100 text-lg">{opt.metadata.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-300 border-zinc-700 border`}>
                        Min Version: {minVersion}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {opt.spec.cipherSuites && opt.spec.cipherSuites.length > 0 
                        ? `${opt.spec.cipherSuites.length} specific cipher suites enforced.` 
                        : 'Using default cipher suites.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    onClick={() => setYamlOption(opt)}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700"
                    onClick={() => {
                      setEditingOption(opt);
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
                      setDeleteTarget(opt.metadata.name);
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

      <CreateTLSOptionDialog
        open={createOpen}
        onOpenChange={(val) => {
          setCreateOpen(val);
          if (!val) setEditingOption(undefined);
        }}
        namespace={namespace}
        editOption={editingOption}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="TLSOption"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlOption} onOpenChange={(open) => !open && setYamlOption(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlOption?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlOption ? yaml.dump(yamlOption, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
