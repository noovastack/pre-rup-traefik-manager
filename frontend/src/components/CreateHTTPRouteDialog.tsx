/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';
import yaml from 'js-yaml';

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
import { Route as RouteIcon, Plus, Trash2, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateHTTPRouteDialog({
  open,
  onOpenChange,
  namespace,
  editRoute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editRoute?: import('@/types').HTTPRoute;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [parentGateway, setParentGateway] = useState('traefik-gateway');
  const [hostnames, setHostnames] = useState('');
  
  const [rules, setRules] = useState<Array<{ pathMatch: string; backendName: string; backendPort: string; weight: string }>>([]);

  const { data: gateways = [], isLoading: isLoadingGW } = useQuery({
    queryKey: ['gateways', namespace],
    queryFn: () => k8sApi.getGateways(namespace),
    enabled: open,
  });

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services', namespace],
    queryFn: () => k8sApi.getServices(namespace),
    enabled: open,
  });

  const { data: traefikServices = [], isLoading: isLoadingTS } = useQuery({
    queryKey: ['traefikservices', namespace],
    queryFn: () => k8sApi.getTraefikServices(namespace),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editRoute.metadata.name);
        setParentGateway(editRoute.spec.parentRefs?.[0]?.name || 'traefik-gateway');
        setHostnames((editRoute.spec.hostnames || []).join(', '));
        
        const initialRules: any[] = [];
        (editRoute.spec.rules || []).forEach((rule: any) => {  
          const pathMatch = rule.matches?.[0]?.path?.value || '/';
          const backendRefs = rule.backendRefs || [];
          if (backendRefs.length === 0) {
            initialRules.push({ pathMatch, backendName: '', backendPort: '80', weight: '1' });
          } else {
            backendRefs.forEach((b: any) => {  
                initialRules.push({
                 pathMatch,
                 backendName: b.name,
                 backendPort: String(b.port),
                 weight: b.weight ? String(b.weight) : '1'
               });
            });
          }
        });
        setRules(initialRules.length > 0 ? initialRules : [{ pathMatch: '/', backendName: 'my-service', backendPort: '80', weight: '1' }]);
      } else {
       
        setName('');
        setParentGateway('traefik-gateway');
        setHostnames('');
        setRules([{ pathMatch: '/', backendName: '', backendPort: '80', weight: '1' }]);
      }
      /* clearError is handled by useResourceForm reset */
      setShowPreview(false);
    }
  }, [open, editRoute]);

  const addRule = () => {
    setRules([...rules, { pathMatch: '/', backendName: '', backendPort: '80', weight: '1' }]);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: string, value: string) => {
    const newRules = [...rules];
    (newRules[index] as any)[field] = value;
    setRules(newRules);
  };

  const generateCRD = () => {
    const ruleMap = new Map<string, unknown[]>();
    rules.forEach(r => {
      const refs = ruleMap.get(r.pathMatch || '/') || [];
      if (r.backendName) {
        refs.push({
          name: r.backendName,
          port: parseInt(r.backendPort, 10) || 80,
          weight: parseInt(r.weight || '1', 10)
        });
      }
      ruleMap.set(r.pathMatch || '/', refs);
    });

    const formattedRules = Array.from(ruleMap.entries()).map(([pathMatch, backendRefs]) => ({
      matches: [{ path: { type: 'PathPrefix', value: pathMatch } }],
      ...(backendRefs.length > 0 ? { backendRefs } : {})
    }));

    return {
      apiVersion: "gateway.networking.k8s.io/v1",
      kind: "HTTPRoute",
      metadata: {
        name: name || 'example-route',
        namespace,
      },
      spec: {
        parentRefs: [{ name: parentGateway || 'traefik-gateway', namespace }],
        ...(hostnames.trim() ? { hostnames: hostnames.split(',').map(h => h.trim()) } : {}),
        rules: formattedRules,
      },
    };
  };

  const { error, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("Please provide a name.");
      if (!parentGateway) throw new Error("Please provide a Parent Gateway name.");
      if (rules.length === 0) throw new Error("Please provide at least one routing rule.");

      for (const r of rules) {
        if (!r.pathMatch || !r.backendName || !r.backendPort) {
           throw new Error("All rules must specify a path, backend service, and port.");
        }
      }

      // Group backends by path match to conform to HTTPRoute spec
      const ruleMap = new Map<string, unknown[]>();
      rules.forEach(r => {
        const refs = ruleMap.get(r.pathMatch) || [];
        refs.push({
          name: r.backendName,
          port: parseInt(r.backendPort, 10),
          weight: parseInt(r.weight || '1', 10)
        });
        ruleMap.set(r.pathMatch, refs);
      });

      const formattedRules = Array.from(ruleMap.entries()).map(([pathMatch, backendRefs]) => ({
        matches: [{ path: { type: 'PathPrefix', value: pathMatch } }],
        backendRefs
      }));

      const crd = {
        apiVersion: "gateway.networking.k8s.io/v1",
        kind: "HTTPRoute",
        metadata: {
          name,
          namespace,
        },
        spec: {
          parentRefs: [{ name: parentGateway, namespace }],
          ...(hostnames.trim() ? { hostnames: hostnames.split(',').map(h => h.trim()) } : {}),
          rules: formattedRules,
        },
      };

      if (editRoute) {
        return k8sApi.updateHTTPRoute(namespace, name, crd as any  );
      } else {
        return k8sApi.createHTTPRoute(namespace, crd as any  );
      }
    },
    invalidateKeys: [['httproutes', namespace]],
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
              <RouteIcon className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-xl tracking-tight">{editRoute ? 'Edit HTTPRoute' : 'Create HTTPRoute'}</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            {editRoute ? 'Update existing' : 'Define'} routing configuration and traffic splitting for the <span className="font-mono text-zinc-300">{namespace}</span> namespace.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md mb-2">
            {error}
          </div>
        )}

        {showPreview ? (
          <div className="py-4">
            <div className="bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
              <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                {yaml.dump(generateCRD(), { indent: 2 })}
              </pre>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-zinc-300 font-medium">Name</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="name"
                name="name"
                disabled={!!editRoute}
                placeholder="e.g. web-route"
                className={`bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors ${editRoute ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="parentGateway" className="text-right text-zinc-300 font-medium">Parent Gateway</Label>
            <div className="col-span-3">
              <Select onValueChange={setParentGateway} value={parentGateway}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 focus:ring-blue-500">
                  <SelectValue placeholder={isLoadingGW ? "Loading Gateways…" : "Select Gateway"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-48">
                  {gateways.length === 0 && !isLoadingGW ? (
                    <SelectItem value="none" disabled>No Gateways in namespace</SelectItem>
                  ) : (
                    gateways.map((gw: any) => (  
                      <SelectItem key={gw.metadata.name} value={gw.metadata.name} className="focus:bg-blue-600/20 focus:text-blue-400">
                        {gw.metadata.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="hostnames" className="text-right text-zinc-300 font-medium">Hostnames</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="hostnames"
                name="hostnames"
                placeholder="e.g. example.com, *.example.com (optional)"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors"
                value={hostnames}
                onChange={e => setHostnames(e.target.value)}
              />
            </div>
          </div>

          <div className="col-span-4 space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 font-medium tracking-wide">Routing Rules & Backends</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={addRule}
                className="h-7 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Rule
              </Button>
            </div>
            
            <div className="space-y-3">
              {rules.map((r, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 group">
                  <div className="col-span-3 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Path Prefix</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       value={r.pathMatch} 
                       onChange={e => updateRule(index, 'pathMatch', e.target.value)} 
                       placeholder="/api"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                  </div>
                  <div className="col-span-4 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">K8s Service</Label>
                     <Select onValueChange={v => updateRule(index, 'backendName', v)} value={r.backendName}>
                       <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 focus:ring-blue-500 text-xs px-2">
                         <SelectValue placeholder={isLoadingServices || isLoadingTS ? "Loading…" : "Select K8s Service"} />
                       </SelectTrigger>
                       <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                         <div className="text-[10px] text-zinc-500 px-2 py-1.5 font-semibold uppercase tracking-wider bg-zinc-900/90 top-0 sticky">Kubernetes Services</div>
                         {services.length === 0 && !isLoadingServices ? (
                           <SelectItem value="none" disabled>No services found</SelectItem>
                         ) : (
                           services.map((s: any) => (  
                             <SelectItem key={s.name} value={s.name} className="focus:bg-blue-600/20 focus:text-blue-400">
                               {s.name}
                             </SelectItem>
                           ))
                         )}
                         <div className="text-[10px] text-orange-500/80 px-2 py-1.5 mt-2 font-semibold uppercase tracking-wider border-t border-zinc-800/50 pt-3 bg-zinc-900/90 sticky">Traefik Services</div>
                         {traefikServices.length === 0 && !isLoadingTS ? (
                           <SelectItem value="none_ts" disabled>No TraefikServices found</SelectItem>
                         ) : (
                           traefikServices.map((ts: any) => (  
                             <SelectItem key={`ts-${ts.metadata.name}`} value={ts.metadata.name} className="focus:bg-orange-600/20 focus:text-orange-400">
                               {ts.metadata.name}
                             </SelectItem>
                           ))
                         )}
                       </SelectContent>
                     </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Port</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       type="number"
                       value={r.backendPort} 
                       onChange={e => updateRule(index, 'backendPort', e.target.value)} 
                       placeholder="8080"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                  </div>
                  <div className="col-span-2 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Weight</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       type="number"
                       value={r.weight} 
                       onChange={e => updateRule(index, 'weight', e.target.value)} 
                       placeholder="1"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                  </div>
                  <div className="col-span-1 flex justify-end pt-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(index)}
                      className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}

        <DialogFooter className="border-t border-zinc-800/80 pt-4 mt-2 sm:justify-between flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPreview(!showPreview)}
            className="text-zinc-400 hover:text-white"
          >
            <Code className="h-4 w-4 mr-2" />
            {showPreview ? 'Back to Form' : 'Preview YAML'}
          </Button>
          <div className="flex gap-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-colors border-0"
            >
              {isPending ? 'Deploying…' : (editRoute ? 'Update CRD' : 'Deploy CRD')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
