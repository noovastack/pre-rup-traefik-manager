import { AlertCircle } from 'lucide-react';

interface CRDNotInstalledProps {
  /** Human-readable name of the required CRD group, e.g. "Traefik" or "Gateway API" */
  crdGroup: string;
  /** Technical API group name, e.g. "traefik.io" or "gateway.networking.k8s.io" */
  apiGroup: string;
  /** Brief description of what this page manages */
  description: string;
}

export function CRDNotInstalled({ crdGroup, apiGroup, description }: CRDNotInstalledProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 mb-6">
        <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {crdGroup} CRDs Not Installed
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-4">
        {description} requires the <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{apiGroup}</code> API group to be installed on this cluster.
      </p>
      <div className="rounded-lg border border-border bg-card px-6 py-4 text-left text-xs text-muted-foreground max-w-sm">
        <p className="font-medium text-foreground mb-2">To install {crdGroup}:</p>
        {crdGroup === 'Gateway API' ? (
          <code className="block bg-muted rounded px-3 py-2 font-mono text-[11px]">
            kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/latest/download/standard-install.yaml
          </code>
        ) : (
          <code className="block bg-muted rounded px-3 py-2 font-mono text-[11px]">
            helm install traefik traefik/traefik
          </code>
        )}
      </div>
    </div>
  );
}
