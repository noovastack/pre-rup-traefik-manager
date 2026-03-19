import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Check, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { k8sApi, capabilitiesApi } from '@/api';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { CRDNotInstalled } from '@/components/CRDNotInstalled';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MiddlewareTCP } from '@/types';
import GenericCRDDialog from '@/components/GenericCRDDialog';

export default function MiddlewareTCPPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMiddleware, setEditMiddleware] = useState<MiddlewareTCP | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: middlewares = [], isLoading } = useQuery({
    queryKey: ['middlewaretcps', namespace],
    queryFn: () => k8sApi.getMiddlewaresTCP(namespace),
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => k8sApi.deleteMiddlewareTCP(namespace, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['middlewaretcps'] }),
  });

  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: capabilitiesApi.get,
    staleTime: 60000,
  });

  const getMiddlewareType = (mw: MiddlewareTCP) => {
    if (mw.spec.inFlightConn) return 'inFlightConn';
    if (mw.spec.ipWhiteList) return 'ipWhiteList';
    return Object.keys(mw.spec)[0] || 'Unknown';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inFlightConn': return <Activity className="h-4 w-4 text-orange-400" />;
      case 'ipWhiteList': return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      default: return <AlertTriangle className="h-4 w-4 text-zinc-400" />;
    }
  };

  const filteredMiddlewares = middlewares.filter((mw) => {
    const t = getMiddlewareType(mw);
    const matchesSearch = mw.metadata.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || t === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreate = () => {
    setEditMiddleware(null);
    setDialogOpen(true);
  };

  const handleEdit = (mw: MiddlewareTCP) => {
    setEditMiddleware(mw);
    setDialogOpen(true);
  };

  if (caps && !caps.traefik) {
    return <CRDNotInstalled crdGroup="Traefik" apiGroup="traefik.io" description="TCP traffic processing rules" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </span>
            TCP Middlewares
          </h1>
          <p className="text-zinc-400 mt-2">Manage connection limits and IP allowlists for TCP streams.</p>
        </div>
        <Button onClick={handleCreate} className="bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20 transition-colors transition-opacity">
          <Plus className="mr-2 h-4 w-4" /> Create Middleware
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input autoComplete="off" spellCheck={false} 
            placeholder="Search TCP middlewares…" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-rose-500"
          />
        </div>
        <Tabs defaultValue="all" className="w-full sm:w-auto" onValueChange={setFilterType}>
          <TabsList className="bg-zinc-950/50 border border-zinc-800">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">All Types</TabsTrigger>
            <TabsTrigger value="inFlightConn" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-400">InFlight</TabsTrigger>
            <TabsTrigger value="ipWhiteList" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-emerald-400">IP Whiteslist</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 bg-zinc-900/40 border-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg bg-zinc-800" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/4 bg-zinc-800" />
                  <Skeleton className="h-4 w-1/3 bg-zinc-800" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredMiddlewares.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-4 bg-zinc-900/40 border-zinc-800/50 border-dashed rounded-xl">
          <div className="p-4 bg-zinc-950 rounded-full mb-4 ring-1 ring-zinc-800">
             <ShieldCheck className="h-8 w-8 text-zinc-600 float-icon" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No TCP Middlewares Found</h3>
          <p className="text-zinc-400 text-center max-w-md mb-6">
            TCP Middlewares allow you to define rules like connection limits or IP whitelisting for your TCP routers.
          </p>
          <Button variant="outline" onClick={handleCreate} className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
            Create Your First TCP Middleware
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMiddlewares.map((mw) => {
            const type = getMiddlewareType(mw);
            return (
              <Card key={mw.metadata.uid} className="group overflow-hidden bg-zinc-900/40 border-zinc-800/50 hover:bg-zinc-900/80 hover:border-zinc-700 transition-colors transition-opacity rounded-xl flex flex-col">
                <div className="p-5 flex-1 cursor-pointer" onClick={() => handleEdit(mw)}>
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-zinc-950 rounded-lg ring-1 ring-zinc-800/50 group-hover:ring-zinc-700 transition-colors">
                          {getTypeIcon(type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-zinc-100 group-hover:text-rose-400 transition-colors truncate max-w-[140px]" title={mw.metadata.name}>
                            {mw.metadata.name}
                          </h3>
                        </div>
                     </div>
                     <Badge variant="outline" className="bg-zinc-950/50 border-zinc-800 text-zinc-400 font-mono text-[10px] capitalize">
                       {type}
                     </Badge>
                  </div>

                  <div className="space-y-3 mt-4">
                    {type === 'inFlightConn' && (
                       <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                         <span className="text-sm text-zinc-500 flex items-center gap-2"><Activity className="h-3 w-3" /> Max Connections</span>
                         <span className="text-sm font-medium text-zinc-200">
                           {mw.spec.inFlightConn?.amount}
                         </span>
                       </div>
                    )}
                    {type === 'ipWhiteList' && (
                       <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
                         <span className="text-sm text-zinc-500 flex items-center gap-2"><Check className="h-3 w-3" /> IPs Allowed</span>
                         <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                           {mw.spec.ipWhiteList?.sourceRange?.length || 0} rules
                         </span>
                       </div>
                    )}
                  </div>
                </div>
                {/* Footer Controls */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/30">
                  <span className="text-xs text-zinc-600 font-mono">2 mins ago</span>
                  <div className="flex gap-2 relative z-10">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(mw)} className="h-8 text-xs text-zinc-400 hover:text-white">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteTarget(mw.metadata.name); }} className="h-8 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor Fallback for specialized Middlewares */}
      <GenericCRDDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={editMiddleware}
        resourceType="middlewaretcp"
        namespace={namespace}
        title="TCP Middleware"
        yamlTemplate={`spec:
  # Example: Limit TCP connections
  inFlightConn:
    amount: 10
  # Example: Restrict TCP connections by IP
  # ipWhiteList:
  #   sourceRange:
  #     - 127.0.0.1/32
  #     - 192.168.1.7`}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        resourceName={deleteTarget ?? ''}
        resourceType="MiddlewareTCP"
        onConfirm={() => { deleteMutation.mutate(deleteTarget!); setDeleteTarget(null); }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
