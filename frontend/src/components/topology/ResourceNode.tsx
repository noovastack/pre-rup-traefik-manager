/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handle, Position } from '@xyflow/react';
import { Globe, Server, Box, Layers, ShieldAlert, Cpu, Network, Lock } from 'lucide-react';

export function ResourceNode({ data }: { data: any }) {  

  let Icon = Box;
  let bgClass = "bg-zinc-900";
  let borderClass = "border-zinc-800";
  const textClass = "text-zinc-100";
  let iconColor = "text-zinc-500";

  switch(data.kind) {
    case 'Gateway':
      Icon = Globe;
      bgClass = "bg-blue-950/30";
      borderClass = "border-blue-500/30";
      iconColor = "text-blue-400";
      break;
    case 'HTTPRoute':
    case 'IngressRoute':
    case 'IngressRouteTCP':
    case 'IngressRouteUDP':
      Icon = Layers;
      bgClass = "bg-emerald-950/30";
      borderClass = "border-emerald-500/30";
      iconColor = "text-emerald-400";
      break;
    case 'Middleware':
      Icon = ShieldAlert;
      bgClass = "bg-orange-950/30";
      borderClass = "border-orange-500/30";
      iconColor = "text-orange-400";
      break;
    case 'Service':
      Icon = Server;
      bgClass = "bg-purple-950/30";
      borderClass = "border-purple-500/30";
      iconColor = "text-purple-400";
      break;
    case 'TraefikService':
      Icon = Network;
      bgClass = "bg-rose-950/30";
      borderClass = "border-rose-500/30";
      iconColor = "text-rose-400";
      break;
    case 'Pod':
      Icon = Cpu;
      bgClass = "bg-zinc-800/40";
      borderClass = "border-zinc-700";
      iconColor = "text-zinc-400";
      break;
  }

  const isDimmed = data.isDimmed;

  return (
    <div className={`px-4 py-3 rounded-xl border ${borderClass} ${bgClass} backdrop-blur-md shadow-xl w-[250px] transition-colors transition-opacity duration-300 ${isDimmed ? 'opacity-40 grayscale' : 'opacity-100'}`}>
      <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-zinc-500 border-none" />
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md bg-black/20 ${borderClass} border`}>
           <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            {data.kind}
            {data.tlsSecretName && (
               <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20" title={`TLS Terminated via: ${data.tlsSecretName}`}>
                 <Lock className="w-3 h-3" />
                 TLS
               </span>
            )}
            {data.serversTransport && (
               <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20" title={`Upstream Transport: ${data.serversTransport}`}>
                 <ShieldAlert className="w-3 h-3" />
                 mTLS
               </span>
            )}
          </span>
          <span className={`text-sm font-medium ${textClass} truncate`}>{data.name}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-zinc-500 border-none" />
    </div>
  );
}
