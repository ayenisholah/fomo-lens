import { Suspense } from "react";
import { Workspace } from "@/components/workspace";
export default function Example() {
  return (
    <Suspense>
      <Workspace publicExample />
    </Suspense>
  );
}
