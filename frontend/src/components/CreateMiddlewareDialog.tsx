/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';

type MiddlewareType = 'StripPrefix' | 'BasicAuth' | 'RateLimit' | 'Plugin';

export function CreateMiddlewareDialog({
  open,
  onOpenChange,
  namespace,
  editMw,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editMw?: any;  
}) {
  // Shared State
  const [name, setName] = useState('');
  const [mwType, setMwType] = useState<MiddlewareType>('StripPrefix');

  // Specific State
  const [prefixes, setPrefixes] = useState(''); // StripPrefix
  const [secretName, setSecretName] = useState(''); // BasicAuth
  const [average, setAverage] = useState(''); // RateLimit
  const [burst, setBurst] = useState('');
  const [pluginJson, setPluginJson] = useState(''); // Plugin config

  // Resets & Populates
  useEffect(() => {
    if (open) {
      if (editMw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editMw.metadata.name);
        
        if (editMw.spec.stripPrefix) {
          setMwType('StripPrefix');
          setPrefixes(editMw.spec.stripPrefix.prefixes?.join(', ') || '');
        } else if (editMw.spec.basicAuth) {
          setMwType('BasicAuth');
          setSecretName(editMw.spec.basicAuth.secret || '');
        } else if (editMw.spec.rateLimit) {
          setMwType('RateLimit');
          setAverage(editMw.spec.rateLimit.average?.toString() || '');
          setBurst(editMw.spec.rateLimit.burst?.toString() || '');
        } else if (editMw.spec.plugin) {
          setMwType('Plugin');
          setPluginJson(JSON.stringify(editMw.spec.plugin, null, 2));
        }
      } else {
       
        setName('');
        setMwType('StripPrefix');
        setPrefixes('');
        setSecretName('');
        setAverage('');
        setBurst('');
        setPluginJson('');
      }
      /* clearError is handled by useResourceForm reset */
    }
  }, [open, editMw]);

  const { error, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("Please provide a name for the middleware.");

      let spec: unknown = {};

      if (mwType === 'StripPrefix') {
        if (!prefixes) throw new Error("Please provide at least one prefix.");
        spec = { stripPrefix: { prefixes: prefixes.split(',').map(s => s.trim()) } };
      } else if (mwType === 'BasicAuth') {
        if (!secretName) throw new Error("Please provide a Kubernetes Secret name.");
        spec = { basicAuth: { secret: secretName } };
      } else if (mwType === 'RateLimit') {
        if (!average || !burst) throw new Error("Please provide both average and burst numbers.");
        spec = { rateLimit: { average: parseInt(average, 10), burst: parseInt(burst, 10) } };
      } else if (mwType === 'Plugin') {
        if (!pluginJson.trim()) throw new Error("Please provide JSON configuration for the plugin.");
        try {
          const parsed = JSON.parse(pluginJson);
          spec = { plugin: parsed };
        } catch {
          throw new Error("Invalid JSON configuration provided for plugin.");
        }
      }

      const crd = {
        apiVersion: "traefik.containo.us/v1alpha1",
        kind: "Middleware",
        metadata: {
          name,
          namespace,
        },
        spec,
      };

      if (editMw) {
        return k8sApi.updateMiddleware(namespace, name, crd);
      } else {
        return k8sApi.createMiddleware(namespace, crd);
      }
    },
    invalidateKeys: [['middlewares', namespace]],
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 border border-emerald-500/20 bg-emerald-500/10 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl tracking-tight">{editMw ? 'Edit Middleware' : 'Create Middleware'}</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            {editMw ? 'Update existing' : 'Define'} traffic modification rules for services in <span className="font-mono text-zinc-300">{namespace}</span>.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md mb-2">
            {error}
          </div>
        )}

        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-zinc-300 font-medium">Name</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="name"
                name="name"
                disabled={!!editMw}
                placeholder="e.g. secure-api, strip-v1"
                className={`bg-zinc-900 border-zinc-800 focus-visible:ring-emerald-500 placeholder:text-zinc-600 transition-colors ${editMw ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="mwType" className="text-right text-zinc-300 font-medium">Type</Label>
            <div className="col-span-3">
              <Select value={mwType} onValueChange={(val: MiddlewareType) => setMwType(val)} disabled={!!editMw}>
                <SelectTrigger className={`w-full bg-zinc-900 border-zinc-800 focus:ring-emerald-500 transition-colors ${editMw ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder="Select middleware type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
                  <SelectItem value="StripPrefix" className="focus:bg-emerald-500/20 focus:text-emerald-300 cursor-pointer">StripPrefix</SelectItem>
                  <SelectItem value="BasicAuth" className="focus:bg-emerald-500/20 focus:text-emerald-300 cursor-pointer">BasicAuth</SelectItem>
                  <SelectItem value="RateLimit" className="focus:bg-emerald-500/20 focus:text-emerald-300 cursor-pointer">RateLimit</SelectItem>
                  <SelectItem value="Plugin" className="focus:bg-emerald-500/20 focus:text-emerald-300 cursor-pointer">Plugin (WASM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Fields */}
          <div className="col-span-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
            {mwType === 'StripPrefix' && (
              <div className="space-y-2">
                <Label htmlFor="prefixes" className="text-zinc-300 font-medium text-sm">Target Prefixes (Comma-separated)</Label>
                <Input autoComplete="off" spellCheck={false}
                  id="prefixes"
                  name="prefixes"
                  placeholder="e.g. /api, /v1, /foo"
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 placeholder:text-zinc-600 transition-colors"
                  value={prefixes}
                  onChange={e => setPrefixes(e.target.value)}
                />
                <p className="text-xs text-zinc-500">Removes the specified prefixes from the URL path before passing the request to your backend.</p>
              </div>
            )}

            {mwType === 'BasicAuth' && (
              <div className="space-y-2">
                <Label htmlFor="secretName" className="text-zinc-300 font-medium text-sm">K8s Secret Name</Label>
                <Input autoComplete="off" spellCheck={false}
                  id="secretName"
                  name="secretName"
                  placeholder="e.g. my-auth-secret"
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 placeholder:text-zinc-600 transition-colors"
                  value={secretName}
                  onChange={e => setSecretName(e.target.value)}
                />
                <p className="text-xs text-zinc-500">The Kubernetes Secret must contain htpasswd-formatted credentials and exist in the {namespace} namespace.</p>
              </div>
            )}

            {mwType === 'RateLimit' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="average" className="text-zinc-300 font-medium text-sm">Average (requests per second)</Label>
                  <Input autoComplete="off" spellCheck={false}
                    id="average"
                    name="average"
                    type="number"
                    placeholder="100"
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 placeholder:text-zinc-600 transition-colors"
                    value={average}
                    onChange={e => setAverage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burst" className="text-zinc-300 font-medium text-sm">Burst Length (maximum total slots)</Label>
                  <Input autoComplete="off" spellCheck={false}
                    id="burst"
                    name="burst"
                    type="number"
                    placeholder="50"
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500 placeholder:text-zinc-600 transition-colors"
                    value={burst}
                    onChange={e => setBurst(e.target.value)}
                  />
                </div>
              </div>
            )}

            {mwType === 'Plugin' && (
              <div className="space-y-2 flex flex-col items-start w-full">
                <Label htmlFor="pluginJson" className="text-zinc-300 font-medium text-sm">WASM Configuration (JSON)</Label>
                <textarea
                  id="pluginJson"
                  name="pluginJson"
                  rows={6}
                  placeholder={`{\n  "demo": {\n    "headers": {\n      "Foo": "Bar"\n    }\n  }\n}`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:outline-none placeholder:text-zinc-600 transition-colors p-3 font-mono text-xs text-zinc-300 resize-none"
                  value={pluginJson}
                  onChange={e => setPluginJson(e.target.value)}
                />
                <p className="text-xs text-zinc-500">Inject raw JSON configuring the instantiated Plugin target.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800/80 pt-4 mt-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Cancel
          </Button>
            <Button
            onClick={() => submit()}
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-colors border-0"
          >
            {isPending ? 'Deploying…' : (editMw ? 'Update CRD' : 'Deploy CRD')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
