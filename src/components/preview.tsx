"use client";
import { Graph } from "./graph";
import { exampleProfile } from "@/lib/examples";
const subjects = [
  "example_trader",
  "solstice",
  "quiet_current",
  "mint_condition",
  "lunar_notes",
];
export function Preview() {
  return (
    <Graph
      profiles={subjects.map(exampleProfile)}
      edges={subjects
        .slice(1)
        .map((target) => ({ source: subjects[0], target }))}
      selected={subjects[0]}
      onSelect={() => {}}
    />
  );
}
