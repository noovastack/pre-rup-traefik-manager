/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { k8sApi, capabilitiesApi } from '@/api';
import yaml from 'js-yaml';
import { Trash2, Edit, Network, Code } from 'lucide-react';
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
import { CreateServersTransportDialog } from '@/components/CreateServersTransportDialog';

export function ServersTransportsPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<any>(undefined);
  const [yamlTransport, setYamlTransport] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: transports = [], isLoading, error } = useQuery({
    queryKey: ['serverstransports', namespace],
    queryFn: () => k8sApi.getServersTransports(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteServersTransport(namespace, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serverstransports', namespace] });
    },
    onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  if (isLoading) return <div className="p-8 text-zinc-400 animate-pulse">Loading ServersTransports…</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error loading ServersTransports: {(error as Error).message}</div>;

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="Upstream TLS and transport config" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">ServersTransports (HTTP)</h2>
          <p className="text-sm text-zinc-400 mt-1">Configure upstream connection settings (mTLS, ServerName) in <span className="text-zinc-300 font-mono bg-zinc-800/50 px-1 py-0.5 rounded">{namespace}</span></p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 transition-colors transition-opacity font-medium border-0">
          <Network className="mr-2 h-4 w-4" /> Create Transport
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/50 shadow-xl backdrop-blur-sm">
        <Table>
          <TableHeader className="bg-zinc-900/80 border-b border-zinc-800">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-zinc-300 font-medium w-1/4">Name</TableHead>
              <TableHead className="text-zinc-300 font-medium w-1/4">ServerName</TableHead>
              <TableHead className="text-zinc-300 font-medium">Verify Certs</TableHead>
              <TableHead className="text-zinc-300 font-medium">Auth</TableHead>
              <TableHead className="text-right text-zinc-300 font-medium whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500">
                  No HTTP ServersTransports found in this namespace.
                </TableCell>
              </TableRow>
            ) : (
              transports.map((st) => (
                <TableRow key={st.metadata.uid} className="hover:bg-zinc-900/50 border-zinc-800/50 transition-colors">
                  <TableCell className="font-medium text-zinc-200">{st.metadata.name}</TableCell>
                  <TableCell className="text-zinc-300 font-mono text-sm">{st.spec.serverName || '-'}</TableCell>
                  <TableCell>
                    {st.spec.insecureSkipVerify ? (
                       <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Skipped</span>
                    ) : (
                       <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-medium">Verified</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">
                    {st.spec.certificatesSecrets?.length ? 'mTLS Configured' : 'None'}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap w-[250px]">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => setYamlTransport(st)}
                      >
                        <Code className="h-4 w-4 mr-1.5" />
                        YAML
                      </Button>
                      <Button
                        variant="ghost" 
                        size="sm"
                        className="h-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                        onClick={() => {
                          setEditingTransport(st);
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
                          setDeleteTarget(st.metadata.name);
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

      <CreateServersTransportDialog
        open={createOpen}
        onOpenChange={(val: boolean) => {
          setCreateOpen(val);
          if (!val) setEditingTransport(undefined);
        }}
        namespace={namespace}
        editTransport={editingTransport}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="ServersTransport"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />

      <Dialog open={!!yamlTransport} onOpenChange={(open) => !open && setYamlTransport(null)}>
        <DialogContent className="sm:max-w-[700px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
                <Code className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl tracking-tight">YAML Definition</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  {yamlTransport?.metadata.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4 bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
              {yamlTransport ? yaml.dump(yamlTransport, { indent: 2 }) : ''}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
