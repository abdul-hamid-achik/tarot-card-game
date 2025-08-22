import "server-only";

import { StackServerApp } from "@stackframe/stack";

const hasStackProject = !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

type MinimalStackApp = {
  getUser: () => Promise<any>;
  toClientJson: () => any;
};

export const stackServerApp: MinimalStackApp = hasStackProject
  ? (new StackServerApp({ tokenStore: "nextjs-cookie" }) as unknown as MinimalStackApp)
  : {
    async getUser() {
      return null;
    },
    toClientJson() {
      return { projectId: null, disabled: true };
    },
  };

// Client-side provider wrapper
// Placed here to keep all Stack-related wiring together
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
export function Providers({ children }: { children: React.ReactNode }) {
  // Importing inside function to avoid server-only constraints when not configured
  let StackProvider: any = ({ children: c }: any) => c;
  let StackTheme: any = ({ children: c }: any) => c;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@stackframe/stack");
    StackProvider = mod.StackProvider ?? StackProvider;
    StackTheme = mod.StackTheme ?? StackTheme;
  } catch { }

  const appJson = (stackServerApp as any).toClientJson?.() ?? { disabled: true };

  return (
    <StackProvider app={appJson}>
      <StackTheme
        className="[--stack-color-primary:theme(colors.purple.500)] [--stack-color-background:theme(colors.slate.950)] [--stack-color-foreground:theme(colors.slate.100)]"
      >
        {children}
      </StackTheme>
    </StackProvider>
  );
}
