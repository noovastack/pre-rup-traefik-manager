import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';
import yaml from 'js-yaml';
import type { IngressRouteTCP } from '@/types';

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
import { Server, Lock, ShieldAlert, Cpu, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateIngressRouteTCPDialog({
  open,
  onOpenChange,
  namespace,
  editRoute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editRoute?: IngressRouteTCP;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [matchrule, setMatchrule] = useState('HostSNI(`*`)');
  const [serviceName, setServiceName] = useState('');
  const [servicePort, setServicePort] = useState('');
  const [tls, setTls] = useState(false);
  const [passthrough, setPassthrough] = useState(false);

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services', namespace],
    queryFn: () => k8sApi.getServices(namespace),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editRoute) {
        setName(editRoute.metadata.name);
        
        const rule = editRoute.spec.routes[0];
        setMatchrule(rule?.match || 'HostSNI(`*`)');
        
        if (rule?.services && rule.services.length > 0) {
          setServiceName(rule.services[0].name);
          setServicePort(rule.services[0].port.toString());
        } else {
          setServiceName('');
          setServicePort('');
        }
        
        setTls(!!editRoute.spec.tls);
        setPassthrough(!!editRoute.spec.tls?.passthrough);
      } else {
        setName('');
        setMatchrule('HostSNI(`*`)');
        setServiceName('');
        setServicePort('');
        setTls(false);
        setPassthrough(false);
      }
      clearError();
      setShowPreview(false);
    }
  }, [open, editRoute]);

  useEffect(() => {
    if (serviceName && services.length > 0) {
      const svc = services.find(s => s.name === serviceName);
      if (svc && svc.ports.length === 1) {
        setServicePort(svc.ports[0].toString());
      }
    }
  }, [serviceName, services]);

  const generateCRD = () => {
    const crd: IngressRouteTCP = {
      metadata: {
        name: name || 'example-tcp-route',
        namespace: namespace,
      },
      spec: {
        routes: [
          {
            match: matchrule || 'HostSNI(`*`)',
            services: [
              {
                name: serviceName || 'example-service',
                port: parseInt(servicePort, 10) || 80,
              },
            ],
          },
        ],
      },
    };

    if (tls) {
      crd.spec.tls = { passthrough: passthrough };
    }
    return crd;
  };

  const { error, clearError, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name || !matchrule || !serviceName || !servicePort) {
        throw new Error("Please fill in all required fields.");
      }

      const crd = generateCRD();

      if (editRoute) {
        return k8sApi.updateIngressRouteTCP(namespace, name, crd);
      } else {
        return k8sApi.createIngressRouteTCP(namespace, crd);
      }
    },
    invalidateKeys: [['ingressroutetcps', namespace]],
    onClose: () => onOpenChange(false),
  });

  const selectedServiceObj = services.find(s => s.name === serviceName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-900/20 to-zinc-950 p-6 border-b border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-400" />
              {editRoute ? 'Edit TCP Route' : 'New TCP Route'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Proxy raw TCP streams like databases or message queues into the cluster.
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

            {showPreview ? (
              <div className="">
                <div className="bg-[#1E1E1E] rounded-md border border-zinc-800 overflow-hidden">
                  <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {yaml.dump(generateCRD(), { indent: 2 })}
                  </pre>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 gap-y-5">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-zinc-300">Route Name</Label>
                <Input autoComplete="off" spellCheck={false} value={name} onChange={e => setName(e.target.value)} disabled={!!editRoute} placeholder="e.g. pgsql-route" className={`bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 ${editRoute ? 'opacity-50 cursor-not-allowed' : ''}`} />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-zinc-300 flex justify-between">
                  <span>Match Rule (SNI)</span>
                </Label>
                <Input autoComplete="off" spellCheck={false} value={matchrule} onChange={e => setMatchrule(e.target.value)} placeholder="HostSNI(`*`) or HostSNI(`db.example.com`)" className="bg-zinc-900 border-zinc-800 font-mono text-sm focus-visible:ring-blue-500" />
                <p className="text-xs text-zinc-500">If terminating TLS, you must match on SNI, otherwise use `HostSNI(`*`)`.</p>
              </div>

              <div className="col-span-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/80 space-y-4 mt-2">
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium mb-1">
                  <Cpu className="h-4 w-4" /> Destination Kubernetes Service
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-1.5">
                    <Select onValueChange={setServiceName} value={serviceName}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700 focus:ring-blue-500">
                        <SelectValue placeholder={isLoadingServices ? "Loading…" : "Select Service"} />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        {services.length === 0 && !isLoadingServices ? (
                          <SelectItem value="none" disabled>No services found</SelectItem>
                        ) : (
                          services.map(s => (
                            <SelectItem key={s.name} value={s.name} className="focus:bg-blue-600/20 focus:text-blue-400">
                              {s.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-1 space-y-1.5">
                    <Select onValueChange={setServicePort} value={servicePort} disabled={!selectedServiceObj || selectedServiceObj.ports.length === 0}>
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
                </div>
              </div>

              <div className="col-span-2 flex flex-col rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 mt-2 transition-colors transition-opacity">
                <div className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2 text-zinc-200">
                      <Lock className="h-4 w-4 text-emerald-500" />
                      Enable TLS
                    </Label>
                    <p className="text-zinc-500 text-sm">Allow Traefik to intercept or passthrough TLS TCP connections.</p>
                  </div>
                  <Switch checked={tls} onCheckedChange={setTls} className="data-[state=checked]:bg-emerald-500" />
                </div>

                {tls && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-0.5">
                      <Label className="text-sm text-zinc-300">TLS Passthrough</Label>
                      <p className="text-xs text-zinc-500">Forward encrypted traffic to backend without terminating.</p>
                    </div>
                    <Switch checked={passthrough} onCheckedChange={setPassthrough} className="data-[state=checked]:bg-emerald-500" />
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-900/20 sm:justify-between flex-row">
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !name || !matchrule || !serviceName || !servicePort} className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 border-0 px-8">
                {isPending ? 'Deploying…' : (editRoute ? 'Update' : 'Deploy')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
