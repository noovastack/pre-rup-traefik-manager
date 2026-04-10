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
import { Globe, Plus, Trash2, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateGatewayDialog({
  open,
  onOpenChange,
  namespace,
  editGateway,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editGateway?: import('@/types').Gateway;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [gatewayClassName, setGatewayClassName] = useState('traefik');
  
  const [listeners, setListeners] = useState<Array<{ name: string; port: string; protocol: string; hostname: string }>>([]);

  const { data: gatewayClasses = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['gatewayclasses'],
    queryFn: () => k8sApi.getGatewayClasses(),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editGateway) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editGateway.metadata.name);
        setGatewayClassName(editGateway.spec.gatewayClassName || '');
        setListeners(
          (editGateway.spec.listeners || []).map((l: any) => ({  
            name: l.name,
            port: String(l.port),
            protocol: l.protocol,
            hostname: l.hostname || '',
          }))
        );
      } else {
       
        setName('');
        setGatewayClassName('traefik');
        setListeners([{ name: 'web', port: '80', protocol: 'HTTP', hostname: '' }]);
      }
      /* clearError is handled by useResourceForm reset */
      setShowPreview(false);
    }
  }, [open, editGateway]);

  const addListener = () => {
    setListeners([...listeners, { name: '', port: '80', protocol: 'HTTP', hostname: '' }]);
  };

  const removeListener = (index: number) => {
    setListeners(listeners.filter((_, i) => i !== index));
  };

  const updateListener = (index: number, field: string, value: string) => {
    const newListeners = [...listeners];
    (newListeners[index] as any)[field] = value;
    setListeners(newListeners);
  };

  const generateCRD = () => {
    return {
      apiVersion: "gateway.networking.k8s.io/v1",
      kind: "Gateway",
      metadata: {
        name: name || 'example-gateway',
        namespace,
      },
      spec: {
        gatewayClassName: gatewayClassName || 'traefik',
        listeners: listeners.map(l => ({
          name: l.name || 'web',
          port: parseInt(l.port, 10) || 80,
          protocol: l.protocol || 'HTTP',
          ...(l.hostname ? { hostname: l.hostname } : {})
        })),
      },
    };
  };

  const { error, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("Please provide a name.");
      if (!gatewayClassName) throw new Error("Please provide a GatewayClass name.");
      if (listeners.length === 0) throw new Error("Please provide at least one listener.");

      for (const l of listeners) {
        if (!l.name || !l.port || !l.protocol) {
           throw new Error("All listeners must have a name, port, and protocol.");
        }
      }

      const crd = generateCRD();

      if (editGateway) {
        return k8sApi.updateGateway(namespace, name, crd as any  );
      } else {
        return k8sApi.createGateway(namespace, crd as any  );
      }
    },
    invalidateKeys: [['gateways', namespace]],
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-xl tracking-tight">{editGateway ? 'Edit Gateway' : 'Create Gateway'}</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            {editGateway ? 'Update existing' : 'Define'} load balancers for the <span className="font-mono text-zinc-300">{namespace}</span> namespace.
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
                disabled={!!editGateway}
                placeholder="e.g. my-gateway"
                className={`bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors ${editGateway ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gatewayClassName" className="text-right text-zinc-300 font-medium">GatewayClass</Label>
            <div className="col-span-3">
              <Select onValueChange={setGatewayClassName} value={gatewayClassName} disabled={!!editGateway}>
                <SelectTrigger className={`bg-zinc-900 border-zinc-800 focus:ring-blue-500 ${editGateway ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder={isLoadingClasses ? "Loading Classes…" : "Select GatewayClass"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-48">
                  {gatewayClasses.length === 0 && !isLoadingClasses ? (
                    <SelectItem value="none" disabled>No GatewayClasses available</SelectItem>
                  ) : (
                    gatewayClasses.map((gc: any) => (  
                      <SelectItem key={gc.metadata.name} value={gc.metadata.name} className="focus:bg-blue-600/20 focus:text-blue-400">
                        {gc.metadata.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 font-medium tracking-wide">Listeners</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={addListener}
                className="h-7 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Listener
              </Button>
            </div>
            
            <div className="space-y-3">
              {listeners.map((l, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start bg-zinc-900/40 p-3 rounded-lg border border-zinc-800/80 group">
                  <div className="col-span-3 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Name</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       value={l.name} 
                       onChange={e => updateListener(index, 'name', e.target.value)} 
                       placeholder="web"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                  </div>
                  <div className="col-span-2 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Port</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       type="number"
                       min={1}
                       max={65535}
                       value={l.port} 
                       onChange={e => updateListener(index, 'port', e.target.value)} 
                       placeholder="80"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                  </div>
                  <div className="col-span-2 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Proto</Label>
                     <Select value={l.protocol} onValueChange={val => updateListener(index, 'protocol', val)}>
                       <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 focus:ring-blue-500 text-xs px-2">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                         <SelectItem value="HTTP">HTTP</SelectItem>
                         <SelectItem value="HTTPS">HTTPS</SelectItem>
                         <SelectItem value="TCP">TCP</SelectItem>
                         <SelectItem value="UDP">UDP</SelectItem>
                         <SelectItem value="TLS">TLS</SelectItem>
                       </SelectContent>
                     </Select>
                  </div>
                  <div className="col-span-4 space-y-1">
                     <Label className="text-[10px] uppercase text-zinc-500 font-semibold px-1">Hostname (Opt)</Label>
                     <Input autoComplete="off" spellCheck={false} 
                       value={l.hostname} 
                       onChange={e => updateListener(index, 'hostname', e.target.value)} 
                       placeholder="*.example.com"
                       className="h-8 bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 text-xs px-2"
                     />
                     <div className="text-[10px] text-zinc-500 px-1 mt-1">Leave empty to match all, or use *.example.com</div>
                  </div>
                  <div className="col-span-1 flex justify-end pt-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeListener(index)}
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
              {isPending ? 'Deploying…' : (editGateway ? 'Update CRD' : 'Deploy CRD')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
