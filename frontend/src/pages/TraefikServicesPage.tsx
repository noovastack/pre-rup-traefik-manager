import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Trash2, Edit, SplitSquareHorizontal, Code } from 'lucide-react';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CreateTraefikServiceDialog } from '@/components/CreateTraefikServiceDialog';

export function TraefikServicesPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(undefined);
  const [yamlService, setYamlService] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['traefikservices', namespace],
    queryFn: () => k8sApi.getTraefikServices(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteTraefikService(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traefikservices', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) return <div className="p-8 text-zinc-400 animate-pulse">Loading TraefikServices…</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error loading TraefikServices: {(error as Error).message}</div>;

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="Advanced load balancing and mirroring" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Traefik Services</h2>
          <p className="text-sm text-zinc-400 mt-1">Configure Weighted Round Robin or Mirroring setups in <span className="text-zinc-300 font-mono bg-zinc-800/50 px-1 py-0.5 rounded">{namespace}</span></p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition-colors transition-opacity font-medium border-0">
          <SplitSquareHorizontal className="mr-2 h-4 w-4" /> Create TraefikService
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/50 shadow-xl backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-zinc-900/80 border-b border-zinc-800">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-zinc-300 font-medium w-1/4">Name</TableHead>
              <TableHead className="text-zinc-300 font-medium w-1/4">Type</TableHead>
              <TableHead className="text-zinc-300 font-medium">Targets</TableHead>
              <TableHead className="text-right text-zinc-300 font-medium whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                  No TraefikServices found in this namespace.
                </TableCell>
              </TableRow>
            ) : (
              services.map((svc) => {
                const isWeighted = !!svc.spec.weighted;
                const isMirroring = !!svc.spec.mirroring;
                let typeBadge = null;
                
                if (isWeighted) {
                  typeBadge = <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Weighted Round Robin</span>;
                } else if (isMirroring) {
                  typeBadge = <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Traffic Mirroring</span>;
                } else {
                  typeBadge = <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-medium">Unknown</span>;
                }

                return (
                  <TableRow key={svc.metadata.uid} className="hover:bg-zinc-900/50 border-zinc-800/50 transition-colors">
                    <TableCell className="font-medium text-zinc-200">{svc.metadata.name}</TableCell>
                    <TableCell>{typeBadge}</TableCell>
                    <TableCell className="text-zinc-300 w-[45%]">
                       <div className="flex flex-col gap-3 py-2 w-full pr-12">
                        {isWeighted && (() => {
                          const totalWeight = svc.spec.weighted?.services?.reduce((acc: number, t: any) => acc + (t.weight || 1), 0) || 1;
                          return (
                            <div className="space-y-4 w-full">
                              {svc.spec.weighted?.services?.map((target: any, i: number) => {
                                const weight = target.weight || 1;
                                const percentage = (weight / totalWeight) * 100;
                                return (
                                  <div key={i} className="flex flex-col gap-1.5 w-full">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/50 text-zinc-200 font-mono shadow-sm">{target.name}</span>
                                        <span className="text-zinc-500 font-mono bg-zinc-900 px-1 rounded">w: {weight}</span>
                                      </div>
                                      <span className="text-orange-400 font-mono font-medium">{percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                                      <div 
                                        className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full transition-colors transition-opacity duration-500 ease-out" 
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {isMirroring && (
                          <div className="space-y-3 w-full relative pl-3 border-l-2 border-zinc-800/50 ml-3 py-1">
                            <div className="flex items-center gap-3 w-full relative">
                              <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-zinc-500 border-2 border-zinc-900" />
                              <span className="text-xs text-zinc-500 font-medium uppercase w-16 tracking-wider">Primary</span>
                              <span className="text-sm bg-zinc-800/80 text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-700/50 flex-1 shadow-sm">{svc.spec.mirroring?.name}</span>
                              <span className="text-xs text-zinc-500 font-mono w-10 text-right opacity-80">100%</span>
                            </div>
                            {svc.spec.mirroring?.mirrors?.map((mirror: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 w-full relative">
                                <div className="absolute -left-[17px] top-[40%] -translate-y-1/2 w-4 h-[1px] bg-indigo-500/50 border-t border-dashed border-indigo-500/30" />
                                <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] border-2 border-zinc-900" />
                                <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider w-16">Mirror</span>
                                <span className="text-sm bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md flex-1 shadow-sm">{mirror.name}</span>
                                <span className="text-xs text-indigo-400 font-mono font-medium w-10 text-right">{mirror.percent || 0}%</span>
                              </div>
                            ))}
                          </div>
                        )}
                       </div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4 whitespace-nowrap w-[250px]">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => setYamlService(svc)}
                        >
                          <Code className="h-4 w-4 mr-1.5" />
                          YAML
                        </Button>
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          onClick={() => {
                            setEditingService(svc);
                            setCreateOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-zinc-500 hover:text-red-400 hover:bg-red-950/50"
                          onClick={() => {
                            setDeleteTarget(svc.metadata.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateTraefikServiceDialog
        open={createOpen}
        onOpenChange={(val: boolean) => {
          setCreateOpen(val);
          if (!val) setEditingService(undefined);
        }}
        namespace={namespace}
        editService={editingService}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="TraefikService"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlService} onOpenChange={(open) => !open && setYamlService(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlService?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlService ? yaml.dump(yamlService, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
