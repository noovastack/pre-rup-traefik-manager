import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';

interface GenericCRDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: any | null;
  resourceType: 'middlewaretcp'; // Extend as needed
  namespace: string;
  title: string;
  yamlTemplate?: string;
}

export default function GenericCRDDialog({
  open,
  onOpenChange,
  resource,
  resourceType,
  namespace,
  title,
  yamlTemplate,
}: GenericCRDDialogProps) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [yamlContent, setYamlContent] = useState('');
  const [error, setError] = useState('');

  // Populate form on edit
  useEffect(() => {
    if (open) {
      if (resource) {
        setName(resource.metadata.name);
        const { metadata, ...rest } = resource;
        try {
           // Provide JSON since YAML parser is not in frontend by default.
           setYamlContent(JSON.stringify(rest.spec || rest, null, 2));
        } catch (e) {
           setYamlContent('{}');
        }
      } else {
        setName('');
        setYamlContent(yamlTemplate || '{\n  "spec": {}\n}');
      }
      setError('');
    }
  }, [open, resource, yamlTemplate]);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (resourceType === 'middlewaretcp') {
        if (resource) {
          return k8sApi.updateMiddlewareTCP(namespace, name, payload);
        }
        return k8sApi.createMiddlewareTCP(namespace, payload);
      }
      throw new Error('Unsupported resource type for GenericCRDDialog');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${resourceType}s`] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    let parsedSpec;
    try {
      parsedSpec = JSON.parse(yamlContent);
    } catch (err) {
      setError('Invalid JSON content. Please ensure it is valid JSON.');
      return;
    }

    const payload = {
      metadata: {
        name,
        namespace,
      },
      spec: parsedSpec.spec || parsedSpec,
    };

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl flex flex-col h-[85vh] sm:h-auto">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {resource ? `Edit ${title}` : `Create ${title}`}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Define the raw JSON specifications for this resource.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300 font-medium tracking-wide text-xs uppercase">
                  Name
                </Label>
                <Input autoComplete="off" spellCheck={false}
                  id="name"
                  placeholder="e.g. limit-tcp-conn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!!resource} // Cannot change name on update
                  className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-rose-500 h-11"
                />
              </div>

              <div className="space-y-2 flex-1 flex flex-col h-full min-h-[300px]">
                <Label htmlFor="spec" className="text-zinc-300 font-medium tracking-wide text-xs uppercase flex justify-between">
                  <span>JSON Specification</span>
                </Label>
                <div className="relative flex-1">
                  <Textarea autoComplete="off" spellCheck={false}
                    id="spec"
                    value={yamlContent}
                    onChange={(e) => setYamlContent(e.target.value)}
                    className="font-mono text-sm bg-zinc-900 border-zinc-800 text-zinc-200 h-full min-h-[400px] resize-none focus-visible:ring-rose-500 p-4 leading-relaxed"
                    placeholder={`{
  "inFlightConn": {
    "amount": 10
  }
}`}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 border-t border-zinc-800 bg-zinc-900/20 sm:justify-between mt-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name}
              className="font-medium shadow-lg border-0 px-8 text-white bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
            >
              {createMutation.isPending ? 'Saving…' : (resource ? 'Update' : 'Deploy')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
