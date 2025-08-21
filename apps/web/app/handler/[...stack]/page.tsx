import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../stack";

export default function Handler(props: unknown) {
  // If Stack is not configured, render a simple fallback
  try {
    // Access toClientJson to ensure app shape is compatible
    const _ = (stackServerApp as any).toClientJson?.() ?? null;
    return <StackHandler fullPage app={stackServerApp as any} routeProps={props as any} />;
  } catch {
    return <div style={{ padding: 24 }}>Auth is not configured.</div>;
  }
}
