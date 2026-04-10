import { useLayoutEffect, useMemo, useState } from 'react';
import { ReactFlow, Controls, Background, MiniMap, useNodesState, useEdgesState, BackgroundVariant, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTopologyGraph } from '@/hooks/useTopologyGraph';
import { getLayoutedElements } from '@/lib/topologyUtils';
import { ResourceNode } from '@/components/topology/ResourceNode';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const nodeTypes = {
  resourceNode: ResourceNode,
};

export function TopologyPage({ namespace }: { namespace: string }) {
  const { nodes: initialNodes, edges: initialEdges, isLoading } = useTopologyGraph(namespace);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isRendered, setIsRendered] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const computed = useMemo(() => {
    const activeNodes = initialNodes;
    const activeEdges = initialEdges;

    if (activeNodes.length === 0) {
      return { finalNodes: [], finalEdges: [] };
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      activeNodes,
      activeEdges
    );

    // If a node is selected, calculate its full upstream/downstream path
    const connectedNodeIds = new Set<string>();
    const connectedEdgeIds = new Set<string>();

      if (selectedNodeId) {
        connectedNodeIds.add(selectedNodeId);
        
        // Build adjacency lists for fast traversal
        const forwardEdges = new Map<string, Edge[]>();
        const backwardEdges = new Map<string, Edge[]>();
        
        layoutedEdges.forEach(e => {
            if (!forwardEdges.has(e.source)) forwardEdges.set(e.source, []);
            forwardEdges.get(e.source)!.push(e);
            
            if (!backwardEdges.has(e.target)) backwardEdges.set(e.target, []);
            backwardEdges.get(e.target)!.push(e);
        });

        // Traverse Downstream (children)
        const queueDown = [selectedNodeId];
        while(queueDown.length > 0) {
            const current = queueDown.shift()!;
            const children = forwardEdges.get(current) || [];
            children.forEach(edge => {
                connectedEdgeIds.add(edge.id);
                if (!connectedNodeIds.has(edge.target)) {
                    connectedNodeIds.add(edge.target);
                    queueDown.push(edge.target);
                }
            });
        }

        // Traverse Upstream (parents)
        const queueUp = [selectedNodeId];
        while(queueUp.length > 0) {
            const current = queueUp.shift()!;
            const parents = backwardEdges.get(current) || [];
            parents.forEach(edge => {
                connectedEdgeIds.add(edge.id);
                if (!connectedNodeIds.has(edge.source)) {
                    connectedNodeIds.add(edge.source);
                    queueUp.push(edge.source);
                }
            });
        }
      }

      // Apply dimming styles to nodes
      const finalNodes = layoutedNodes.map(node => {
          let isDimmed = false;
          if (selectedNodeId) {
             isDimmed = !connectedNodeIds.has(node.id);
          } else if (searchQuery) {
             const searchLower = searchQuery.toLowerCase();
             const nodeName = String(node.data.name || '').toLowerCase();
             const nodeKind = String(node.data.kind || '').toLowerCase();
             isDimmed = !nodeName.includes(searchLower) && !nodeKind.includes(searchLower);
          }
          return { ...node, data: { ...node.data, isDimmed } };
      });

      // Apply dimming styles to edges
      const finalEdges = layoutedEdges.map(edge => {
          if (!selectedNodeId) {
             const opacity = searchQuery ? 0.3 : 1;
             return { ...edge, style: { ...edge.style, opacity }, animated: true };
          }
          const isConnected = connectedEdgeIds.has(edge.id);
          return { 
             ...edge, 
             style: { ...edge.style, opacity: isConnected ? 1 : 0.15 },
             animated: isConnected // Only animate the active flow
          };
      });

    return { finalNodes, finalEdges };
  }, [initialNodes, initialEdges, selectedNodeId, searchQuery]);

  useLayoutEffect(() => {
    setNodes(computed.finalNodes);
    setEdges(computed.finalEdges);
    queueMicrotask(() => setIsRendered(true));
  }, [computed, setNodes, setEdges]);

  if (isLoading && !isRendered) {
    return <div className="text-zinc-500 animate-pulse">Loading Topology map…</div>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Network Topology</h2>
          <p className="text-xs text-muted-foreground">Namespace: <span className="text-primary font-mono">{namespace}</span></p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            autoComplete="off"
            spellCheck={false}
            placeholder="Search by name or kind…"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="relative flex-1 min-h-0 bg-muted/20">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            nodeTypes={nodeTypes}
            fitView
            className="h-full w-full"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="hsl(var(--border))" />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              className="!bg-background !border-border"
            />
          </ReactFlow>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No network resources found to map in this namespace.
          </div>
        )}
      </div>
    </div>
  );
}
