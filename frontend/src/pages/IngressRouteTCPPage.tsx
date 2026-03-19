import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Trash2, Edit, Route, Code } from 'lucide-react';
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
import { CreateIngressRouteTCPDialog } from '@/components/CreateIngressRouteTCPDialog';

export function IngressRouteTCPPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(undefined);
  const [yamlRoute, setYamlRoute] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: routes = [], isLoading, error } = useQuery({
    queryKey: ['ingressroutetcps', namespace],
    queryFn: () => k8sApi.getIngressRouteTCPs(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteIngressRouteTCP(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingressroutetcps', namespace] });
    },
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) return <div className="p-8 text-zinc-400 animate-pulse">Loading TCP routes…</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error loading routes: {(error as Error).message}</div>;

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="TCP stream routing rules" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">TCP Routes</h2>
          <p className="text-sm text-zinc-400 mt-1">Manage Traefik TCP IngressRoutes in <span className="text-zinc-300 font-mono bg-zinc-800/50 px-1 py-0.5 rounded">{namespace}</span></p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-colors transition-opacity font-medium border-0">
          <Route className="mr-2 h-4 w-4" /> Create TCP Route
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/50 shadow-xl backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-zinc-900/80 border-b border-zinc-800">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-zinc-300 font-medium">Name</TableHead>
              <TableHead className="text-zinc-300 font-medium">SNI Match / Port</TableHead>
              <TableHead className="text-zinc-300 font-medium">Target Service</TableHead>
              <TableHead className="text-right text-zinc-300 font-medium whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                  No TCP Routes found in this namespace.
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route.metadata.uid} className="hover:bg-zinc-900/50 border-zinc-800/50 transition-colors">
                  <TableCell className="font-medium text-zinc-200">{route.metadata.name}</TableCell>
                  <TableCell className="font-mono text-xs text-blue-400 bg-blue-500/10 px-2 py-1/2 rounded inline-block mt-2">
                    {route.spec.routes?.[0]?.match || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-zinc-300">
                     <div className="flex flex-col gap-1">
                      {route.spec.routes?.[0]?.services?.map((svc, i) => (
                        <span key={i} className="text-sm bg-zinc-800/80 px-2 py-1 rounded inline-flex w-fit items-center gap-1.5 border border-zinc-700/50">
                          {svc.name}
                          <span className="text-zinc-500 text-xs">:{svc.port}</span>
                        </span>
                      ))}
                     </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => setYamlRoute(route)}
                      >
                        <Code className="h-4 w-4 mr-1.5" />
                        YAML
                      </Button>
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setEditingRoute(route);
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
                          setDeleteTarget(route.metadata.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateIngressRouteTCPDialog
        open={createOpen}
        onOpenChange={(val: boolean) => {
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
        resourceType="IngressRouteTCP"
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
