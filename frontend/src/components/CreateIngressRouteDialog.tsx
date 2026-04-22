/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';
import type { IngressRoute } from '@/types';

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
import { Switch } from '@/components/ui/switch';
import { Globe, Lock, ShieldAlert, Cpu } from 'lucide-react';
import { Label } from '@/components/ui/label';
import SelectInput from 'react-select';

// Styled react-select to match our dark theme
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: '#18181b', // bg-zinc-900
    borderColor: state.isFocused ? '#3b82f6' : '#27272a', // border-zinc-800 focus:ring-blue-500
    color: 'white',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#3b82f6' : '#3f3f46'
    }
  }),
  menu: (base: any) => ({
    ...base,
    background: '#18181b',
    border: '1px solid #27272a',
    zIndex: 50
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? '#2563eb33' : 'transparent', // blue-600/20
    color: state.isFocused ? '#60a5fa' : '#e4e4e7', // blue-400 : zinc-200
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#2563eb'
    }
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: '#3f3f46', // zinc-700
    borderRadius: '4px'
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: '#e4e4e7' // zinc-200
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: '#a1a1aa', // zinc-400
    '&:hover': {
      backgroundColor: '#ef444433', // red-500/20
      color: '#f87171' // red-400
    }
  }),
  input: (base: any) => ({
    ...base,
    color: '#e4e4e7'
  })
};

export function CreateIngressRouteDialog({
  open,
  onOpenChange,
  namespace,
  editRoute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editRoute?: IngressRoute;
}) {
  // Form State
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [serversTransport, setServersTransport] = useState('');
  const [selectedMiddlewares, setSelectedMiddlewares] = useState<Array<{ value: string; label: string }>>([]);
  const [tls, setTls] = useState(false);
  const [certResolver, setCertResolver] = useState('default');

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

  const { data: serversTransports = [] } = useQuery({
    queryKey: ['serverstransports', namespace],
    queryFn: () => k8sApi.getServersTransports(namespace),
    enabled: open,
  });

  const { data: middlewares = [], isLoading: isLoadingMws } = useQuery({
    queryKey: ['middlewares', namespace],
    queryFn: () => k8sApi.getMiddlewares(namespace),
    enabled: open,
  });

  // Resets & Populates
  useEffect(() => {
    if (open) {
      if (editRoute) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editRoute.metadata.name);
        
        // Extract host
        const rule = editRoute.spec.routes[0];
        const hostMatch = rule?.match.match(/Host\(`([^`]+)`\)/);
        setHost(hostMatch ? hostMatch[1] : '');
        
        // Extract service
        if (rule?.services && rule.services.length > 0) {
          setServiceName(rule.services[0].name);
       
          setServicePort(rule.services[0].port.toString());
          setServersTransport((rule.services[0] as any).serversTransport || '');
        } else {
          setServiceName('');
       
          setServicePort('');
          setServersTransport('');
        }
        
        // Extract middlewares
        if (rule?.middlewares) {
          setSelectedMiddlewares(rule.middlewares.map((m: any) => ({ value: m.name, label: m.name })));  
        } else {
          setSelectedMiddlewares([]);
        }
        
        setTls(!!editRoute.spec.tls);
        if (editRoute.spec.tls && editRoute.spec.tls.certResolver) {
          setCertResolver(editRoute.spec.tls.certResolver);
        } else {
          setCertResolver('default');
        }
      } else {
       
        setName('');
        setHost('');
        setServiceName('');
       
        setServicePort('');
        setServersTransport('');
        setSelectedMiddlewares([]);
        setTls(false);
        setCertResolver('default');
      }
      /* clearError is handled by useResourceForm reset */
    }
  }, [open, editRoute]);

  // Watch service selection to auto-select port if only 1 is available
  useEffect(() => {
    if (serviceName && services.length > 0) {
      const svc = services.find(s => s.name === serviceName);
      if (svc && svc.ports?.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setServicePort(svc.ports[0].toString());
      }
    }
  }, [serviceName, services]);

  const { error, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name || !host || !serviceName || !servicePort) {
        throw new Error("Please fill in all required fields.");
      }

      const crd: IngressRoute = {
        metadata: {
          name: name,
          namespace: namespace,
        },
        spec: {
          entryPoints: tls ? ['websecure'] : ['web'],
          routes: [
            {
              match: `Host(\`${host}\`)`,
              kind: 'Rule',
              services: [
                {
                  name: serviceName,
                  port: parseInt(servicePort, 10),
                  kind: traefikServices.some((ts: any) => ts.metadata.name === serviceName) ? 'TraefikService' : 'Service',  
                  ...((serversTransport && serversTransport !== 'none') ? { serversTransport } : {})
                },
              ],
              middlewares: selectedMiddlewares.map(m => ({ name: m.value }))
            },
          ],
        },
      };

      if (tls) {
        crd.spec.tls = editRoute && editRoute.spec.tls ? { ...editRoute.spec.tls } : {};
        if (certResolver) {
          crd.spec.tls.certResolver = certResolver;
        } else {
          delete crd.spec.tls.certResolver;
        }
      }

      if (editRoute) {
        return k8sApi.updateIngressRoute(namespace, name, crd);
      } else {
        return k8sApi.createIngressRoute(namespace, crd);
      }
    },
    invalidateKeys: [['ingressroutes', namespace]],
    onClose: () => onOpenChange(false),
  });

  const selectedServiceObj = services.find(s => s.name === serviceName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl shadow-blue-900/10">
        <div className="bg-gradient-to-r from-blue-900/20 to-zinc-950 p-6 border-b border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-400" />
              {editRoute ? 'Edit Ingress Route' : 'New Ingress Route'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {editRoute ? 'Update the existing' : 'Create a new'} proxy route in the <span className="text-blue-400 font-mono text-xs bg-blue-950/30 px-1 py-0.5 rounded">{namespace}</span> namespace.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-red-950/50 border border-red-900 text-red-400 p-3 rounded-md text-sm flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 gap-y-5">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-zinc-300">Route Name</Label>
                <Input autoComplete="off" spellCheck={false} value={name} onChange={e => setName(e.target.value)} disabled={!!editRoute} placeholder="e.g. auth-api-route" className={`bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 ${editRoute ? 'opacity-50 cursor-not-allowed' : ''}`} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-zinc-300">Domain / Host</Label>
                <Input autoComplete="off" spellCheck={false} value={host} onChange={e => setHost(e.target.value)} placeholder="api.example.com" className="bg-zinc-900 border-zinc-800 font-mono text-sm focus-visible:ring-blue-500" />
              </div>

              <div className="col-span-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/80 space-y-4 mt-2">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium mb-1">
                  <Cpu className="h-4 w-4" /> Destination Service
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="sr-only">Service Name</Label>
                    <Select onValueChange={setServiceName} value={serviceName}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 focus:ring-blue-500">
                        <SelectValue placeholder={isLoadingServices || isLoadingTS ? "Loading…" : "Select Service"} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-[300px]">
                        <div className="text-xs text-zinc-500 px-2 py-1.5 font-semibold uppercase tracking-wider bg-zinc-900/90 top-0 sticky">Kubernetes Services</div>
                        {services.length === 0 && !isLoadingServices ? (
                          <SelectItem value="none" disabled>No services found</SelectItem>
                        ) : (
                          services.map(s => (
                            <SelectItem key={s.name} value={s.name} className="focus:bg-blue-600/20 focus:text-blue-400">
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                        
                        <div className="text-xs text-orange-500/80 px-2 py-1.5 mt-2 font-semibold uppercase tracking-wider border-t border-zinc-800/50 pt-3 bg-zinc-900/90 sticky">Traefik Services</div>
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

                  <div className="col-span-1 space-y-1.5">
                    <Label className="sr-only">Port</Label>
                    <Select 
                      onValueChange={setServicePort} 
                      value={servicePort}
                      disabled={!selectedServiceObj || selectedServiceObj.ports.length === 0}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 focus:ring-blue-500">
                        <SelectValue placeholder="Port" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        {selectedServiceObj?.ports.map(p => (
                          <SelectItem key={p} value={p.toString()} className="focus:bg-blue-600/20 focus:text-blue-400">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 space-y-1.5">
                    <Label className="sr-only">Transport</Label>
                    <Select onValueChange={setServersTransport} value={serversTransport}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 focus:ring-blue-500">
                        <SelectValue placeholder="Transport" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="none">Default</SelectItem>
                        {serversTransports.map(st => (
                          <SelectItem key={st.metadata.name} value={st.metadata.name}>
                            <div className="flex items-center gap-2">
                              {st.metadata.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-1.5 mt-2">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-zinc-500" /> Middlewares (Optional)
                </Label>
                <div className="text-xs text-zinc-500 mb-2">Attach traffic rules like authentication or rate limiting to this route.</div>
                <SelectInput
                  isMulti
                  options={middlewares.map((m: any) => ({ value: m.metadata.name, label: m.metadata.name }))}  
                  value={selectedMiddlewares}
                  onChange={(newValue) => setSelectedMiddlewares(newValue as Array<{ value: string; label: string }>)}
                  styles={selectStyles}
                  placeholder={isLoadingMws ? "Loading…" : "Select Middlewares…"}
                  noOptionsMessage={() => "No middlewares found"}
                />
              </div>

              <div className="col-span-2 flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 mt-2 transition-colors transition-opacity">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2 text-zinc-200">
                      <Lock className="h-4 w-4 text-emerald-500" />
                      Enable HTTPS / TLS
                    </Label>
                    <p className="text-zinc-500 text-sm">
                      Automatically request a certificate and serve traffic on port 443.
                    </p>
                  </div>
                  <Switch checked={tls} onCheckedChange={setTls} className="data-[state=checked]:bg-emerald-500" />
                </div>

                {tls && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm text-zinc-300">Certificate Resolver</Label>
                      <p className="text-xs text-zinc-500">The name of the Traefik certResolver (e.g., 'le', 'cloudflare')</p>
                    </div>
                    <Input autoComplete="off" spellCheck={false} 
                      value={certResolver} 
                      onChange={e => setCertResolver(e.target.value)} 
                      placeholder="default" 
                      className="w-[200px] bg-zinc-950 border-zinc-800 focus-visible:ring-emerald-500" 
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-900/20 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name || !host || !serviceName || !servicePort} className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 border-0 px-8">
              {isPending ? 'Deploying…' : (editRoute ? 'Update Route' : 'Deploy Route')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
