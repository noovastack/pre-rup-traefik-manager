import { useState, useEffect } from 'react';
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
import { Globe, Code } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function CreateGatewayClassDialog({
  open,
  onOpenChange,
  editClass,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editClass?: unknown;
}) {
  const [showPreview, setShowPreview] = useState(false);
  
  const [name, setName] = useState('');
  const [controllerName, setControllerName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      if (editClass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editClass.metadata.name);
        setControllerName(editClass.spec.controllerName || '');
        setDescription(editClass.spec.description || '');
      } else {
       
        setName('');
        setControllerName('traefik.io/gateway-controller');
        setDescription('');
      }
      /* clearError is handled by useResourceForm reset */
      setShowPreview(false);
    }
  }, [open, editClass]);

  const generateCRD = () => {
    return {
      apiVersion: "gateway.networking.k8s.io/v1",
      kind: "GatewayClass",
      metadata: {
        name: name || 'example-class',
      },
      spec: {
        controllerName: controllerName || 'traefik.io/gateway-controller',
        ...(description ? { description } : {})
      },
    };
  };

  const { error, isPending, submit } = useResourceForm({
    mutationFn: () => {
      if (!name) throw new Error("Please provide a name.");
      if (!controllerName) throw new Error("Please provide a controller name.");

      const crd = generateCRD();

      if (editClass) {
        return k8sApi.updateGatewayClass(name, crd as import('@/types').GatewayClass);
      } else {
        return k8sApi.createGatewayClass(crd as unknown);
      }
    },
    invalidateKeys: [['gatewayclasses']],
    onClose: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 border border-blue-500/20 bg-blue-500/10 rounded-lg">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>
            <DialogTitle className="text-xl tracking-tight">{editClass ? 'Edit GatewayClass' : 'Create GatewayClass'}</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400">
            {editClass ? 'Update existing' : 'Define'} cluster-scoped GatewayClasses managed by operators.
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
                disabled={!!editClass}
                placeholder="e.g. traefik"
                className={`bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors ${editClass ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="controllerName" className="text-right text-zinc-300 font-medium">Controller Name</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="controllerName"
                name="controllerName"
                placeholder="e.g. traefik.io/gateway-controller"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors"
                value={controllerName}
                onChange={e => setControllerName(e.target.value)}
              />
              <p className="text-xs text-zinc-500 mt-2">The name of the controller that manages this GatewayClass.</p>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-zinc-300 font-medium">Description</Label>
            <div className="col-span-3">
              <Input autoComplete="off" spellCheck={false}
                id="description"
                name="description"
                placeholder="Optional description"
                className="bg-zinc-900 border-zinc-800 focus-visible:ring-blue-500 placeholder:text-zinc-600 transition-colors"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
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
              {isPending ? 'Deploying…' : (editClass ? 'Update CRD' : 'Deploy CRD')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
