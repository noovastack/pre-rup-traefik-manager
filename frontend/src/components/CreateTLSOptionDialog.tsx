import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi } from '@/api';
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
import { ShieldAlert, Plus, X, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateTLSOptionDialog({
  open,
  onOpenChange,
  namespace,
  editOption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editOption?: any;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [minVersion, setMinVersion] = useState('VersionTLS12');
  const [cipherSuites, setCipherSuites] = useState<string[]>([]);
  const [newCipher, setNewCipher] = useState('');

  // Resets & Populates
  useEffect(() => {
    if (open) {
      if (editOption) {
        setName(editOption.metadata.name);
        setMinVersion(editOption.spec.minVersion || 'VersionTLS12');
        setCipherSuites(editOption.spec.cipherSuites || []);
      } else {
        setName('');
        setMinVersion('VersionTLS12');
        setCipherSuites([]);
      }
      setNewCipher('');
      setError('');
      setShowPreview(false);
    }
  }, [open, editOption]);

  const addCipherSuite = () => {
    if (newCipher && !cipherSuites.includes(newCipher)) {
      setCipherSuites([...cipherSuites, newCipher]);
      setNewCipher('');
    }
  };

  const removeCipherSuite = (cipher: string) => {
    setCipherSuites(cipherSuites.filter(c => c !== cipher));
  };

  const generateCRD = () => {
    const crd: any = {
      apiVersion: "traefik.containo.us/v1alpha1",
      kind: "TLSOption",
      metadata: {
        name: name || 'example-tls',
        namespace,
      },
      spec: {
        minVersion,
      },
    };

    if (cipherSuites.length > 0) {
      crd.spec.cipherSuites = cipherSuites;
    }

    return crd;
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name) throw new Error("Please provide a name for the TLS Option.");

      const crd = generateCRD();

      if (editOption) {
        return k8sApi.updateTlsOption(namespace, name, crd);
      } else {
        return k8sApi.createTlsOption(namespace, crd);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tlsoptions', namespace] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message || `Failed to ${editOption ? 'update' : 'create'} TLS Option`);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-900/20 to-zinc-950 p-6 border-b border-zinc-800">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 border border-teal-500/20 bg-teal-500/10 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-teal-400" />
              </div>
              <DialogTitle className="text-xl tracking-tight">{editOption ? 'Edit TLS Option' : 'Create TLS Option'}</DialogTitle>
            </div>
            <DialogDescription className="text-zinc-400">
              {editOption ? 'Update existing' : 'Define'} strict TLS security policies for <span className="font-mono text-zinc-300">{namespace}</span>.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded-md">
              {error}
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-zinc-300 font-medium">Name</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="name"
                name="name"
                autoComplete="off"
                disabled={!!editOption}
                placeholder="e.g. strict-tls"
                className={`bg-zinc-900 border-zinc-800 focus-visible:ring-teal-500 placeholder:text-zinc-600 transition-colors ${editOption ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="minVersion" className="text-right text-zinc-300 font-medium whitespace-nowrap">Min Version</Label>
            <div className="col-span-3">
              <Select value={minVersion} onValueChange={setMinVersion}>
                <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-teal-500 transition-colors">
                  <SelectValue placeholder="Select Minimum TLS Version" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl">
                  <SelectItem value="VersionTLS10" className="focus:bg-teal-500/20 focus:text-teal-300 cursor-pointer">TLS 1.0 (Insecure)</SelectItem>
                  <SelectItem value="VersionTLS11" className="focus:bg-teal-500/20 focus:text-teal-300 cursor-pointer">TLS 1.1 (Insecure)</SelectItem>
                  <SelectItem value="VersionTLS12" className="focus:bg-teal-500/20 focus:text-teal-300 cursor-pointer">TLS 1.2 (Standard)</SelectItem>
                  <SelectItem value="VersionTLS13" className="focus:bg-teal-500/20 focus:text-teal-300 cursor-pointer">TLS 1.3 (Strict)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="col-span-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-4 shadow-inner">
            <div>
              <Label className="text-zinc-300 font-medium text-sm">Cipher Suites (Optional)</Label>
              <p className="text-xs text-zinc-500 mt-1 mb-3">Explicitly define allowed cipher suites. Leave blank to use defaults.</p>
              
              <div className="flex gap-2 mb-3">
                <Input autoComplete="off" spellCheck={false}
                  placeholder="e.g. TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-teal-500 text-xs font-mono"
                  value={newCipher}
                  onChange={e => setNewCipher(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCipherSuite();
                    }
                  }}
                />
                <Button type="button" onClick={addCipherSuite} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {cipherSuites.length > 0 && (
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {cipherSuites.map((cipher) => (
                    <div key={cipher} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-700/50 px-3 py-2 rounded-md group">
                      <span className="text-xs font-mono text-zinc-300 truncate mr-2" title={cipher}>{cipher}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => removeCipherSuite(cipher)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </div>

        <DialogFooter className="bg-zinc-900/20 border-t border-zinc-800/80 p-6 sm:justify-between flex-row">
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
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => createMutation.mutate()} 
              disabled={createMutation.isPending}
              className="bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 transition-colors transition-opacity border-0 px-8 font-medium"
            >
              {createMutation.isPending ? 'Deploying…' : (editOption ? 'Update Option' : 'Deploy Option')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
