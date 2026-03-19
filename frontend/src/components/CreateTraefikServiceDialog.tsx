import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';
import yaml from 'js-yaml';
import type { TraefikService } from '@/types';

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
import { SplitSquareHorizontal, ShieldAlert, Plus, Trash2, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

export function CreateTraefikServiceDialog({
  open,
  onOpenChange,
  namespace,
  editService,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editService?: TraefikService;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'weighted' | 'mirroring'>('weighted');

  // Weighted State
  const [weightedServices, setWeightedServices] = useState<{name: string, port: string, weight: string, serversTransport: string}[]>([
    { name: '', port: '', weight: '1', serversTransport: '' }
  ]);

  // Mirroring State
  const [primaryService, setPrimaryService] = useState({ name: '', port: '' });
  const [mirrors, setMirrors] = useState<{name: string, port: string, percent: string}[]>([
    { name: '', port: '', percent: '10' }
  ]);

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services', namespace],
    queryFn: () => k8sApi.getServices(namespace),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (editService) {
        setName(editService.metadata.name);
        
        if (editService.spec.weighted) {
          setType('weighted');
          setWeightedServices(editService.spec.weighted.services.map((s: any) => ({
            name: s.name,
            port: s.port?.toString() || '',
            weight: s.weight?.toString() || '1',
            serversTransport: s.serversTransport || ''
          })));
        } else if (editService.spec.mirroring) {
          setType('mirroring');
          setPrimaryService({
            name: editService.spec.mirroring.name,
            port: editService.spec.mirroring.port?.toString() || ''
          });
          setMirrors(editService.spec.mirroring.mirrors.map((m: any) => ({
            name: m.name,
            port: m.port?.toString() || '',
            percent: m.percent?.toString() || '10'
          })));
        }
      } else {
        setName('');
        setType('weighted');
        setWeightedServices([{ name: '', port: '', weight: '1', serversTransport: '' }]);
        setPrimaryService({ name: '', port: '' });
        setMirrors([{ name: '', port: '', percent: '10' }]);
      }
      clearError();
      setShowPreview(false);
    }
  }, [open, editService]);

  const generateCRD = () => {
    const crd: TraefikService = {
      metadata: { name: name || 'example-traefik-service', namespace },
      spec: {},
    };

    if (type === 'weighted') {
      const validServices = weightedServices.filter(s => s.name.trim() !== '');
      if (validServices.length === 0) {
        crd.spec.weighted = {
          services: [{ name: 'example-service', port: 80, weight: 1 }]
        };
      } else {
        crd.spec.weighted = {
          services: validServices.map(s => ({
            name: s.name,
            port: s.port ? parseInt(s.port, 10) : undefined,
            weight: s.weight ? parseInt(s.weight, 10) : 1,
            ...((s.serversTransport && s.serversTransport !== 'none') ? { serversTransport: s.serversTransport } : {})
          }))
        };
      }
    } else {
      crd.spec.mirroring = {
        name: primaryService.name || 'primary-service',
        port: primaryService.port ? parseInt(primaryService.port, 10) : undefined,
        mirrors: mirrors.filter(m => m.name.trim() !== '').length > 0 ? mirrors.filter(m => m.name.trim() !== '').map(m => ({
          name: m.name,
          port: m.port ? parseInt(m.port, 10) : undefined,
          percent: m.percent ? parseInt(m.percent, 10) : undefined
        })) : [{ name: 'mirror-service', port: 80, percent: 10 }]
      };
    }
    return crd;
  };

  const { error, clearError, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("Service name is required.");

      const crd = generateCRD();

      if (editService) {
        return k8sApi.updateTraefikService(namespace, name, crd);
      } else {
        return k8sApi.createTraefikService(namespace, crd);
      }
    },
    invalidateKeys: [['traefikservices', namespace]],
    onClose: () => onOpenChange(false),
  });

  const renderServiceSelect = (val: string, onChange: (v: string) => void) => (
    <Select onValueChange={onChange} value={val}>
      <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9">
        <SelectValue placeholder={isLoadingServices ? "Loading…" : "Service"} />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-48">
        {services.length === 0 ? (
          <SelectItem value="none" disabled>No services</SelectItem>
        ) : (
          services.map(s => <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>)
        )}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-orange-900/20 to-zinc-950 p-6 border-b border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <SplitSquareHorizontal className="h-5 w-5 text-orange-400" />
              {editService ? 'Edit TraefikService' : 'New TraefikService'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create an advanced routing abstraction over Kubernetes Services.
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
            <>
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Name</Label>
              <Input autoComplete="off" spellCheck={false} value={name} onChange={e => setName(e.target.value)} disabled={!!editService} placeholder="e.g. backend-canary" className={`bg-zinc-900 border-zinc-800 focus-visible:ring-orange-500 ${editService ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>

            <Tabs value={type} onValueChange={(v) => setType(v as 'weighted' | 'mirroring')} className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900 rounded-lg p-1.5 h-auto">
                <TabsTrigger value="weighted" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-orange-400 py-2">Weighted Round Robin</TabsTrigger>
                <TabsTrigger value="mirroring" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-indigo-400 py-2">Traffic Mirroring</TabsTrigger>
              </TabsList>

              <TabsContent value="weighted" className="space-y-4 pt-4 outline-none">
                <div className="rounded border border-zinc-800/80 bg-zinc-900/30 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-zinc-300">Target Services</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setWeightedServices([...weightedServices, { name: '', port: '', weight: '1', serversTransport: '' }])} className="h-7 text-xs bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                      <Plus className="h-3 w-3 mr-1" /> Add Target
                    </Button>
                  </div>

                  {weightedServices.length === 2 && (
                    <div className="mb-6 px-4 py-5 bg-zinc-950/50 rounded-lg border border-zinc-800">
                      <div className="flex justify-between items-center mb-6">
                        <div className="text-center">
                          <span className="block text-orange-400 font-semibold mb-1 truncate max-w-[120px]" title={weightedServices[0].name}>{weightedServices[0].name || 'Service A'}</span>
                          <span className="inline-block bg-orange-900/30 text-orange-300 text-xs px-2 py-0.5 rounded border border-orange-500/20">{weightedServices[0].weight} W</span>
                        </div>
                        <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Traffic Split</div>
                        <div className="text-center">
                          <span className="block text-indigo-400 font-semibold mb-1 truncate max-w-[120px]" title={weightedServices[1].name}>{weightedServices[1].name || 'Service B'}</span>
                          <span className="inline-block bg-indigo-900/30 text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-500/20">{weightedServices[1].weight} W</span>
                        </div>
                      </div>
                      <Slider
                        value={[parseInt(weightedServices[0].weight) || 50]}
                        max={100}
                        step={1}
                        className="my-4"
                        onValueChange={(val) => {
                          const w1 = val[0];
                          const w2 = 100 - w1;
                          const n = [...weightedServices];
                          n[0].weight = w1.toString();
                          n[1].weight = w2.toString();
                          setWeightedServices(n);
                        }}
                      />
                      <p className="text-[11px] text-zinc-500 mt-4 text-center">Canary Rollout slider auto-calculates weighted distribution up to 100.</p>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    {weightedServices.map((ws, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          {renderServiceSelect(ws.name, (v) => {
                            const newSvcs = Array.from(weightedServices);
                            newSvcs[index] = { ...newSvcs[index], name: v };
                            setWeightedServices(newSvcs);
                          })}
                        </div>
                        <div className="w-16">
                          <Input autoComplete="off" spellCheck={false} placeholder="Port" value={ws.port} onChange={e => { const n = Array.from(weightedServices); n[index] = { ...n[index], port: e.target.value }; setWeightedServices(n); }} className="h-9 bg-zinc-950 border-zinc-800 text-sm px-2" />
                        </div>
                        <div className="w-20">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">W:</span>
                            <Input autoComplete="off" spellCheck={false} placeholder="1" value={ws.weight} onChange={e => { const n = Array.from(weightedServices); n[index] = { ...n[index], weight: e.target.value }; setWeightedServices(n); }} className="h-9 pl-6 bg-zinc-950 border-zinc-800 text-sm px-2" />
                          </div>
                        </div>
                        <div className="w-32">
                           <Input autoComplete="off" spellCheck={false} placeholder="Transport (Opt)" value={ws.serversTransport} onChange={e => { const n = Array.from(weightedServices); n[index] = { ...n[index], serversTransport: e.target.value }; setWeightedServices(n); }} className="h-9 bg-zinc-950 border-zinc-800 text-xs px-2" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => { const n = Array.from(weightedServices); n.splice(index, 1); setWeightedServices(n); }} className="h-9 w-9 text-zinc-500 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mirroring" className="space-y-4 pt-4 outline-none">
                <div className="space-y-4">
                  <div className="rounded border border-zinc-800/80 bg-zinc-900/30 p-4">
                    <Label className="text-zinc-300 mb-3 block">Primary Service (Main Traffic)</Label>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        {renderServiceSelect(primaryService.name, (v) => setPrimaryService({...primaryService, name: v}))}
                      </div>
                      <div className="w-24">
                        <Input autoComplete="off" spellCheck={false} placeholder="Port" value={primaryService.port} onChange={e => setPrimaryService({...primaryService, port: e.target.value})} className="h-9 bg-zinc-950 border-zinc-800 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded border border-indigo-900/30 bg-indigo-950/10 p-4">
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-indigo-300">Mirrored Targets (Fire & Forget)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={() => setMirrors([...mirrors, { name: '', port: '', percent: '10' }])} className="h-7 text-xs bg-indigo-950 border-indigo-900 hover:bg-indigo-900 text-indigo-300">
                        <Plus className="h-3 w-3 mr-1" /> Add Mirror
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {mirrors.map((m, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="flex-1">
                            {renderServiceSelect(m.name, (v) => {
                              const n = Array.from(mirrors); n[index] = { ...n[index], name: v }; setMirrors(n);
                            })}
                          </div>
                          <div className="w-20">
                            <Input autoComplete="off" spellCheck={false} placeholder="Port" value={m.port} onChange={e => { const n = Array.from(mirrors); n[index] = { ...n[index], port: e.target.value }; setMirrors(n); }} className="h-9 bg-zinc-950 border-indigo-900 text-sm" />
                          </div>
                          <div className="w-24">
                            <div className="relative">
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-500">%</span>
                              <Input autoComplete="off" spellCheck={false} placeholder="10" value={m.percent} onChange={e => { const n = Array.from(mirrors); n[index] = { ...n[index], percent: e.target.value }; setMirrors(n); }} className="h-9 bg-zinc-950 border-indigo-900 text-sm focus-visible:ring-indigo-500" />
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => { const n = Array.from(mirrors); n.splice(index, 1); setMirrors(n); }} className="h-9 w-9 text-zinc-500 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            </>
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
              <Button type="submit" disabled={isPending || !name} className={`font-medium shadow-lg border-0 px-8 text-white ${type === 'weighted' ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}>
                {isPending ? 'Saving…' : (editService ? 'Update' : 'Deploy')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
