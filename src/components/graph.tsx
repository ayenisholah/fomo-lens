"use client";
import { useMemo } from "react";
import { ReactFlow, Background, Controls, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Profile } from "@/lib/research-contract";
export function Graph({
  profiles,
  edges,
  selected,
  onSelect,
}: {
  profiles: Profile[];
  edges: { source: string; target: string }[];
  selected: string;
  onSelect: (subject: string) => void;
}) {
  const nodes = useMemo(
    () =>
      profiles.map((p, i) => ({
        id: p.subject,
        position:
          i === 0
            ? { x: 300, y: 220 }
            : {
                x:
                  300 +
                  260 *
                    Math.cos(
                      ((i - 1) * 2 * Math.PI) /
                        Math.max(1, profiles.length - 1),
                    ),
                y:
                  220 +
                  180 *
                    Math.sin(
                      ((i - 1) * 2 * Math.PI) /
                        Math.max(1, profiles.length - 1),
                    ),
              },
        data: { label: "@" + p.subject },
        selected: p.subject === selected,
        style: {
          background: p.subject === selected ? "#203f2e" : "#121819",
          color: "#EAF1EF",
          border:
            "1px solid " + (p.subject === selected ? "#B9F6CF" : "#40504b"),
          borderRadius: 8,
          width: 170,
          padding: 16,
          fontSize: 12,
        },
      })),
    [profiles, selected],
  );
  const lines = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        id: e.source + ":" + e.target,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#85EEB3" },
        style: { stroke: "#4b7860" },
        ariaLabel: e.source + " follows " + e.target,
      })),
    [edges],
  );
  return (
    <div className="graph" aria-label="Observed following graph">
      <ReactFlow
        nodes={nodes}
        edges={lines}
        onNodeClick={(_, n) => onSelect(n.id)}
        fitView
        minZoom={0.3}
        maxZoom={2}
        colorMode="dark"
        nodesDraggable={false}
        proOptions={{ hideAttribution: false }}
      >
        <Background color="#263132" gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
