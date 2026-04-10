import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clusterApi } from '@/api';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, Plus, Server, Trash2, Loader2 } from 'lucide-react';

export function ClusterSwitcher() {
  const queryClient = useQueryClient();
  const [activeCluster, setActiveCluster] = useState(() => localStorage.getItem('tm_cluster') || 'local');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newClusterName, setNewClusterName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newToken, setNewToken] = useState('');
  const [newCaCert, setNewCaCert] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: clusters = [] } = useQuery({
    queryKey: ['clusters'],
    queryFn: clusterApi.getClusters,
  });

  const createMutation = useMutation({
    mutationFn: () => clusterApi.createCluster(newClusterName, newServerUrl, newToken, newCaCert),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      setIsAddOpen(false);
      setNewClusterName('');
      setNewServerUrl('');
      setNewToken('');
      setNewCaCert('');
      setErrorMsg('');
      handleClusterChange(data.name);
    },
    onError: (err: unknown) => {
      setErrorMsg(err.message || 'Failed to connect to cluster');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clusterApi.deleteCluster,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      const deletedCluster = clusters.find(c => c.id === deletedId);
      if (deletedCluster && activeCluster === deletedCluster.name) {
        handleClusterChange('local');
      }
    }
  });

  const handleClusterChange = (name: string) => {
    localStorage.setItem('tm_cluster', name);
    setActiveCluster(name);
    window.location.reload(); // Hard reload to reset all query states cleanly and re-fetch everything
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 mb-2">
            <div className="flex items-center gap-2 truncate">
              <Server className="h-4 w-4 text-blue-500" />
              <span className="truncate">{activeCluster === 'local' ? 'Local Cluster' : activeCluster}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300">
          <DropdownMenuItem 
            onClick={() => handleClusterChange('local')}
            className="cursor-pointer hover:bg-zinc-800"
          >
            <Server className="h-4 w-4 mr-2" />
            Local Cluster
          </DropdownMenuItem>
          {clusters.map(cluster => (
            <DropdownMenuItem 
              key={cluster.id} 
              className="group cursor-pointer flex justify-between items-center hover:bg-zinc-800"
              onClick={() => handleClusterChange(cluster.name)}
            >
              <div className="flex items-center truncate">
                <Server className="h-4 w-4 mr-2 text-blue-400" />
                <span className="truncate">{cluster.name}</span>
              </div>
              {deleteMutation.isPending && deleteMutation.variables === cluster.id ? (
                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin shrink-0" />
              ) : (
                <Trash2 
                  className="h-4 w-4 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to remove the cluster "${cluster.name}" from Traefik Manager?`)) {
                      deleteMutation.mutate(cluster.id);
                    }
                  }}
                />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-zinc-800" />
          <DropdownMenuItem 
            onClick={() => setIsAddOpen(true)}
            className="cursor-pointer text-blue-400 focus:text-blue-300 focus:bg-blue-900/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Remote Cluster
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Add Remote Cluster</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Provide the API server URL and a bearer token. Credentials will be AES-GCM encrypted before storage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-400">Cluster Name</Label>
              <Input
                name="clusterName"
                autoComplete="off"
                spellCheck={false}
                value={newClusterName}
                onChange={(e) => setNewClusterName(e.target.value)}
                placeholder="e.g. prod-us-east-1"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-400">API Server URL</Label>
              <Input
                name="serverUrl"
                autoComplete="off"
                spellCheck={false}
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                placeholder="https://your-cluster:6443"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-400">Bearer Token</Label>
              <Input
                type="password"
                name="token"
                autoComplete="off"
                spellCheck={false}
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiIs…"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-zinc-400">CA Certificate (Optional)</Label>
              <Textarea
                name="caCert"
                spellCheck={false}
                value={newCaCert}
                onChange={(e) => setNewCaCert(e.target.value)}
                placeholder="Paste PEM-encoded CA cert here, or leave blank to skip TLS verification…"
                className="font-mono text-xs bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 h-[120px] whitespace-pre"
              />
            </div>
            {errorMsg && (
              <div className="text-red-400 text-sm bg-red-950/20 p-3 rounded-md border border-red-900/50">
                {errorMsg}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); setErrorMsg(''); }} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newClusterName || !newServerUrl || !newToken || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createMutation.isPending ? 'Connecting…' : 'Connect & Encrypt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
