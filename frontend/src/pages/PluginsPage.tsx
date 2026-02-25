import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { Save, Blocks, Tag, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// A local representation of a single Traefik Plugin (as defined in traefik.yml under experimental.plugins)
interface WasmPlugin {
  moduleName: string;
  version: string;
}

export function PluginsPage({ namespace }: { namespace: string }) {
  const queryClient = useQueryClient();
  const [plugins, setPlugins] = useState<Record<string, WasmPlugin>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState('');
  
  // Create state for adding a new plugin
  const [newAlias, setNewAlias] = useState('');
  const [newModule, setNewModule] = useState('');
  const [newVersion, setNewVersion] = useState('');

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['pluginsConfig', namespace],
    queryFn: () => k8sApi.getPluginConfig(namespace),
  });

  useEffect(() => {
    if (config?.experimental?.plugins) {
      setPlugins(config.experimental.plugins);
      setHasChanges(false);
    } else {
      setPlugins({});
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (newConfig: any) => k8sApi.updatePluginConfig(namespace, newConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pluginsConfig', namespace] });
      setHasChanges(false);
      setSaveError('');
    },
    onError: (err: Error) => {
      setSaveError(err.message || 'Failed to save plugin configuration.');
    }
  });

  const handleSave = () => {
    const payload = {
      experimental: {
        plugins: plugins
      }
    };
    updateMutation.mutate(payload);
  };

  const handleAddPlugin = () => {
    if (!newAlias || !newModule || !newVersion) return;
    setPlugins(prev => ({
      ...prev,
      [newAlias]: { moduleName: newModule, version: newVersion }
    }));
    setNewAlias('');
    setNewModule('');
    setNewVersion('');
    setHasChanges(true);
  };

  const handleRemovePlugin = (alias: string) => {
    setPlugins(prev => {
      const next = { ...prev };
      delete next[alias];
      return next;
    });
    setHasChanges(true);
  };

  if (isLoading) return <div className="p-8 text-zinc-400 animate-pulse">Loading Plugins Configuration…</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-950/20 border border-red-900 rounded-lg">Error loading configuration: {(error as Error).message}</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-emerald-400 flex items-center gap-2">
            <Blocks className="h-6 w-6" /> WebAssembly Plugins
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Register WASM plugin modules dynamically. Applied configurations will trigger a trailing pod restart.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || updateMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-500/20 transition-colors font-medium"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving K8s Map…' : 'Commit Configuration'}
        </Button>
      </div>

      {saveError && (
        <div className="bg-red-950/50 border border-red-900 text-red-400 p-4 rounded-lg text-sm">
          {saveError}
        </div>
      )}

      {/* Plugin Registry Table */}
      <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-950/50 shadow-xl backdrop-blur-sm p-6 space-y-6">
        <h3 className="text-lg font-medium text-zinc-200">Registered Modules</h3>
        
        {Object.keys(plugins).length === 0 ? (
          <div className="text-center py-8 text-zinc-500 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
            No WebAssembly plugins are currently active in this environment.
          </div>
        ) : (
          <div className="grid gap-4">
            {Object.entries(plugins).map(([alias, details]) => (
              <div key={alias} className="flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg group hover:border-emerald-500/30 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono font-medium">{alias}</span>
                    <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-xs border border-zinc-700">v{details.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                    <Link2 className="h-3 w-3" />
                    <span>{details.moduleName}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleRemovePlugin(alias)} className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Plugin Context */}
      <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-zinc-900/30 p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-medium text-zinc-200 mb-4">Register New Plugin</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-3 space-y-1.5">
            <Label className="text-zinc-300">Local Alias</Label>
            <Input autoComplete="off" spellCheck={false} 
              value={newAlias} 
              onChange={e => setNewAlias(e.target.value)} 
              placeholder="e.g. demo-plugin" 
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-zinc-200" 
            />
          </div>
          <div className="md:col-span-6 space-y-1.5">
            <Label className="text-zinc-300">GitHub / URL Module Path</Label>
            <Input autoComplete="off" spellCheck={false} 
              value={newModule} 
              onChange={e => setNewModule(e.target.value)} 
              placeholder="github.com/traefik/plugindemo" 
              className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-zinc-200 font-mono text-sm" 
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-zinc-300">Version</Label>
            <div className="relative">
               <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500" />
               <Input autoComplete="off" spellCheck={false} 
                 value={newVersion} 
                 onChange={e => setNewVersion(e.target.value)} 
                 placeholder="0.2.1" 
                 className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 text-zinc-200 pl-8 font-mono text-sm" 
               />
            </div>
          </div>
          <div className="md:col-span-1">
            <Button 
               onClick={handleAddPlugin} 
               disabled={!newAlias || !newModule || !newVersion}
               className="w-full bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
