import { useState, useEffect } from 'react';
import { k8sApi } from '@/api';
import { useResourceForm } from '@/hooks/useResourceForm';
import yaml from 'js-yaml';
import type { ServersTransport } from '@/types';

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
import { Switch } from '@/components/ui/switch';
import { Network, ShieldAlert, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateServersTransportDialog({
  open,
  onOpenChange,
  namespace,
  editTransport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  namespace: string;
  editTransport?: ServersTransport;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [serverName, setServerName] = useState('');
  const [insecureSkipVerify, setInsecureSkipVerify] = useState(false);
  const [certificatesSecrets, setCertificatesSecrets] = useState('');
  const [rootCAsSecrets, setRootCAsSecrets] = useState('');

  useEffect(() => {
    if (open) {
      if (editTransport) {
        setName(editTransport.metadata.name);
        setServerName(editTransport.spec.serverName || '');
        setInsecureSkipVerify(!!editTransport.spec.insecureSkipVerify);
        setCertificatesSecrets((editTransport.spec.certificatesSecrets || []).join(', '));
        setRootCAsSecrets((editTransport.spec.rootCAsSecrets || []).join(', '));
      } else {
        setName('');
        setServerName('');
        setInsecureSkipVerify(false);
        setCertificatesSecrets('');
        setRootCAsSecrets('');
      }
      clearError();
      setShowPreview(false);
    }
  }, [open, editTransport]);

  const generateCRD = () => {
    const crd: ServersTransport = {
      metadata: { name: name || 'example-transport', namespace },
      spec: {
        serverName: serverName || undefined,
        insecureSkipVerify: insecureSkipVerify,
        certificatesSecrets: certificatesSecrets.split(',').map(s => s.trim()).filter(Boolean),
        rootCAsSecrets: rootCAsSecrets.split(',').map(s => s.trim()).filter(Boolean),
      },
    };

    if (crd.spec.certificatesSecrets?.length === 0) delete crd.spec.certificatesSecrets;
    if (crd.spec.rootCAsSecrets?.length === 0) delete crd.spec.rootCAsSecrets;
    
    return crd;
  };

  const { error, clearError, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("ServersTransport name is required.");

      const crd = generateCRD();

      if (editTransport) {
        return k8sApi.updateServersTransport(namespace, name, crd);
      } else {
        return k8sApi.createServersTransport(namespace, crd);
      }
    },
    invalidateKeys: [['serverstransports', namespace]],
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-pink-900/20 to-zinc-950 p-6 border-b border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Network className="h-5 w-5 text-pink-400" />
              {editTransport ? 'Edit ServersTransport' : 'New ServersTransport'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure how Traefik communicates with upstream HTTP backend servers.
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
              <Input autoComplete="off" spellCheck={false} value={name} onChange={e => setName(e.target.value)} disabled={!!editTransport} placeholder="e.g. backend-mtls" className={`bg-zinc-900 border-zinc-800 focus-visible:ring-pink-500 ${editTransport ? 'opacity-50 cursor-not-allowed' : ''}`} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">ServerName (SNI)</Label>
              <Input autoComplete="off" spellCheck={false} value={serverName} onChange={e => setServerName(e.target.value)} placeholder="e.g. internal.backend.local" className="bg-zinc-900 border-zinc-800 focus-visible:ring-pink-500" />
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="space-y-0.5">
                <Label className="text-base text-zinc-200">Insecure Skip Verify</Label>
                <p className="text-zinc-500 text-sm">Disable TLS certificate verification for upstream servers.</p>
              </div>
              <Switch checked={insecureSkipVerify} onCheckedChange={setInsecureSkipVerify} className="data-[state=checked]:bg-pink-500" />
            </div>

            <div className="space-y-1.5 border-t border-zinc-800/80 pt-4">
              <Label className="text-zinc-300">Certificates Secrets (mTLS)</Label>
              <Input autoComplete="off" spellCheck={false} value={certificatesSecrets} onChange={e => setCertificatesSecrets(e.target.value)} placeholder="Comma-separated Kubernetes secret names" className="bg-zinc-900 border-zinc-800 focus-visible:ring-pink-500" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-300">RootCAs Secrets</Label>
              <Input autoComplete="off" spellCheck={false} value={rootCAsSecrets} onChange={e => setRootCAsSecrets(e.target.value)} placeholder="Comma-separated Kubernetes secret names" className="bg-zinc-900 border-zinc-800 focus-visible:ring-pink-500" />
            </div>
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
              <Button type="submit" disabled={isPending || !name} className="bg-pink-600 hover:bg-pink-500 text-white font-medium shadow-lg shadow-pink-500/20 border-0 px-8">
                {isPending ? 'Saving…' : (editTransport ? 'Update' : 'Deploy')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
