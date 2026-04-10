import { useQuery, useQueries } from '@tanstack/react-query';
import { k8sApi } from '@/api';
import { useMemo } from 'react';
import type { Node, Edge } from '@xyflow/react';

const EMPTY_ARRAY: unknown[] = [];

export function useTopologyGraph(namespace: string) {
  const { data: gateways = EMPTY_ARRAY, isLoading: isLoadingGw } = useQuery({
    queryKey: ['gateways', namespace],
    queryFn: () => k8sApi.getGateways(namespace),
  });

  const { data: httpRoutes = EMPTY_ARRAY, isLoading: isLoadingHttp } = useQuery({
    queryKey: ['httproutes', namespace],
    queryFn: () => k8sApi.getHTTPRoutes(namespace),
  });

  const { data: ingressRoutes = EMPTY_ARRAY, isLoading: isLoadingIng } = useQuery({
    queryKey: ['ingressroutes', namespace],
    queryFn: () => k8sApi.getIngressRoutes(namespace),
  });

  const { data: middlewares = EMPTY_ARRAY, isLoading: isLoadingMw } = useQuery({
    queryKey: ['middlewares', namespace],
    queryFn: () => k8sApi.getMiddlewares(namespace),
  });

  const { data: middlewaresTCP = EMPTY_ARRAY, isLoading: isLoadingMwTcp } = useQuery({
    queryKey: ['middlewarestcp', namespace],
    queryFn: () => k8sApi.getMiddlewaresTCP(namespace),
  });

  const { data: ingressRouteTCPs = EMPTY_ARRAY, isLoading: isLoadingIngTcp } = useQuery({
    queryKey: ['ingressroutetcps', namespace],
    queryFn: () => k8sApi.getIngressRouteTCPs(namespace),
  });

  const { data: ingressRouteUDPs = EMPTY_ARRAY, isLoading: isLoadingIngUdp } = useQuery({
    queryKey: ['ingressrouteudps', namespace],
    queryFn: () => k8sApi.getIngressRouteUDPs(namespace),
  });

  const { data: traefikServices = EMPTY_ARRAY, isLoading: isLoadingTsvc } = useQuery({
    queryKey: ['traefikservices', namespace],
    queryFn: () => k8sApi.getTraefikServices(namespace),
  });

  const { data: services = EMPTY_ARRAY, isLoading: isLoadingSvc } = useQuery({
    queryKey: ['services', namespace],
    queryFn: () => k8sApi.getServices(namespace),
  });

  const endpointQueries = useQueries({
    queries: (services || []).map((svc: unknown) => ({
      queryKey: ['endpoints', namespace, svc.name],
      queryFn: () => k8sApi.getEndpoints(namespace, svc.name)
    }))
  });

  const isLoadingEndpoints = endpointQueries.some(q => q.isLoading);

  const endpointData = JSON.stringify(endpointQueries.map(q => q.data));
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    const addNode = (id: string, type: 'resourceNode', data: unknown) => {
      if (!initialNodes.find(n => n.id === id)) {
         initialNodes.push({ id, type, data, position: { x: 0, y: 0 } });
      }
    };

    const addEdge = (source: string, target: string, id?: string, label?: string) => {
      initialEdges.push({ 
        id: id || `e-${source}-${target}`, 
        source, 
        target,
        animated: true,
        label,
        labelBgPadding: label ? [8, 4] : undefined,
        labelBgBorderRadius: label ? 4 : undefined,
        labelBgStyle: label ? { fill: '#27272a', color: '#fff', fillOpacity: 0.8 } : undefined,
        labelStyle: label ? { fill: '#fff' } : undefined,
        style: { stroke: '#71717a', strokeWidth: 2 } // zinc-500
      });
    };

    // 1. Gateways
    gateways.forEach(gw => {
      const gwId = `gw-${gw.metadata.name}`;
      addNode(gwId, 'resourceNode', { 
        kind: 'Gateway', 
        name: gw.metadata.name,
      });
    });

    // 2. HTTPRoutes
    httpRoutes.forEach(route => {
      const routeId = `httproute-${route.metadata.name}`;
      addNode(routeId, 'resourceNode', {
        kind: 'HTTPRoute',
        name: route.metadata.name,
      });

      // Link to parent Gateways
      route.spec?.parentRefs?.forEach((ref: unknown) => {
        if (ref.kind === 'Gateway' || !ref.kind) {
           addEdge(`gw-${ref.name}`, routeId);
        }
      });

      // Link to Services and ExtensionRef Middlewares
      route.spec?.rules?.forEach((rule: unknown) => {
        const lastSource = routeId;

        // Parse Gateway API ExtensionRef filters (e.g. Traefik Middlewares)
        rule.filters?.forEach((f: unknown) => {
           if (f.type === 'ExtensionRef' && f.extensionRef?.kind === 'Middleware') {
                const mwId = `mw-${f.extensionRef.name}`;
                addEdge(lastSource, mwId);
                lastSource = mwId; // Sequential chain handling
           }
        });

        rule.backendRefs?.forEach((bk: unknown) => {
          const weightLabel = bk.weight !== undefined ? `Weight: ${bk.weight}` : undefined;
          if (bk.kind === 'Service' || !bk.kind) {
             addEdge(lastSource, `svc-${bk.name}`, undefined, weightLabel);
          } else if (bk.kind === 'TraefikService') {
             addEdge(lastSource, `tsvc-${bk.name}`, undefined, weightLabel);
          }
        });
      });
    });

    // 3. Middlewares
    middlewares.forEach(mw => {
        const mwId = `mw-${mw.metadata.name}`;
        addNode(mwId, 'resourceNode', {
            kind: 'Middleware',
            name: mw.metadata.name,
        });
    });

    // 3b. MiddlewaresTCP
    middlewaresTCP.forEach(mwtcp => {
        const mwId = `mwtcp-${mwtcp.metadata.name}`;
        addNode(mwId, 'resourceNode', {
            kind: 'MiddlewareTCP',
            name: mwtcp.metadata.name,
        });
    });

    // 4. IngressRoutes
    ingressRoutes.forEach(route => {
        const routeId = `ingressroute-${route.metadata.name}`;
        addNode(routeId, 'resourceNode', {
          kind: 'IngressRoute',
          name: route.metadata.name,
          tlsSecretName: route.spec?.tls?.secretName || (route.spec?.tls ? 'Default/Auto TLS' : undefined),
        });

        route.spec?.routes?.forEach((r: unknown) => {
            let lastSource = routeId;
            
            r.middlewares?.forEach((mw: unknown) => {
                const mwId = `mw-${mw.name}`;
                addEdge(lastSource, mwId);
                lastSource = mwId; // chain them sequentially
            });

            r.services?.forEach((svc: unknown) => {
                if (svc.kind === 'Service' || !svc.kind) {
                     addEdge(lastSource, `svc-${svc.name}`);
                } else if (svc.kind === 'TraefikService') {
                     addEdge(lastSource, `tsvc-${svc.name}`);
                }
            });
        });
    });

    // 4b. IngressRouteTCPs
    ingressRouteTCPs.forEach(route => {
        const routeId = `ingressroutetcp-${route.metadata.name}`;
        addNode(routeId, 'resourceNode', {
          kind: 'IngressRouteTCP',
          name: route.metadata.name,
          tlsSecretName: route.spec?.tls?.secretName || (route.spec?.tls?.passthrough ? 'Passthrough' : undefined),
        });

        route.spec?.routes?.forEach((r: unknown) => {
            let lastSource = routeId;
            
            r.middlewares?.forEach((mw: unknown) => {
                const mwId = `mwtcp-${mw.name}`;
                addEdge(lastSource, mwId);
                lastSource = mwId;
            });

            r.services?.forEach((svc: unknown) => {
                // TCP routes can also target TraefikServices, assuming kind is provided
                if (svc.kind === 'Service' || !svc.kind) {
                     addEdge(lastSource, `svc-${svc.name}`);
                } else if (svc.kind === 'TraefikService') {
                     addEdge(lastSource, `tsvc-${svc.name}`);
                }
            });
        });
    });

    // 4c. IngressRouteUDPs
    ingressRouteUDPs.forEach(route => {
        const routeId = `ingressrouteudp-${route.metadata.name}`;
        addNode(routeId, 'resourceNode', {
          kind: 'IngressRouteUDP',
          name: route.metadata.name,
        });

        route.spec?.routes?.forEach((r: unknown) => {
            const lastSource = routeId;
            // UDP has no middlewares
            r.services?.forEach((svc: unknown) => {
                if (svc.kind === 'Service' || !svc.kind) {
                     addEdge(lastSource, `svc-${svc.name}`);
                } else if (svc.kind === 'TraefikService') {
                     addEdge(lastSource, `tsvc-${svc.name}`);
                }
            });
        });
    });

    // 5. TraefikServices
    traefikServices.forEach((tsvc: unknown) => {
        const tsvcId = `tsvc-${tsvc.metadata.name}`;
        addNode(tsvcId, 'resourceNode', {
            kind: 'TraefikService',
            name: tsvc.metadata.name,
        });

        // Add weighted routes
        if (tsvc.spec?.weighted?.services) {
            tsvc.spec.weighted.services.forEach((s: unknown) => {
                const targetId = s.kind === 'TraefikService' ? `tsvc-${s.name}` : `svc-${s.name}`;
                addEdge(tsvcId, targetId);
                // Piggyback serversTransport info onto the target service node if present
                if (s.serversTransport && s.kind !== 'TraefikService') {
                   const existingSvc = initialNodes.find(n => n.id === targetId);
                   if (existingSvc) existingSvc.data = { ...existingSvc.data, serversTransport: s.serversTransport };
                   else initialNodes.push({ id: targetId, type: 'resourceNode', data: { kind: 'Service', name: s.name, serversTransport: s.serversTransport }, position: { x: 0, y: 0 }});
                }
            });
        }

        // Add mirror routes
        if (tsvc.spec?.mirroring) {
            if (tsvc.spec.mirroring.name) {
                addEdge(tsvcId, `svc-${tsvc.spec.mirroring.name}`); // primary
            }
            if (tsvc.spec.mirroring.mirrors) {
                tsvc.spec.mirroring.mirrors.forEach((m: unknown) => {
                    addEdge(tsvcId, m.kind === 'TraefikService' ? `tsvc-${m.name}` : `svc-${m.name}`);
                });
            }
        }
    });

    // 6. Services and Pods
    services.forEach((svc, idx) => {
        const svcId = `svc-${svc.name}`;
        // If the service node was preemptively created by a TraefikService (to attach serversTransport info), don't overwrite it
        if (!initialNodes.find(n => n.id === svcId)) {
           addNode(svcId, 'resourceNode', {
               kind: 'Service',
               name: svc.name,
           });
        }

        const eps = endpointQueries[idx]?.data || [];
        eps.forEach(ep => {
            const podId = `pod-${ep.name}`;
            addNode(podId, 'resourceNode', {
                kind: 'Pod',
                name: ep.name,
            });
            addEdge(svcId, podId);
        });
    });

    return { nodes: initialNodes, edges: initialEdges };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gateways, 
    httpRoutes, 
    ingressRoutes, 
    ingressRouteTCPs,
    ingressRouteUDPs,
    middlewares, 
    middlewaresTCP,
    traefikServices,
    services, 
    // Deep compare endpoints to avoid infinite loops since useQueries returns new refs
    endpointData
  ]);

  const isLoading = isLoadingGw || isLoadingHttp || isLoadingIng || isLoadingIngTcp || isLoadingIngUdp || isLoadingMw || isLoadingMwTcp || isLoadingTsvc || isLoadingSvc || isLoadingEndpoints;

  return { nodes, edges, isLoading };
}
