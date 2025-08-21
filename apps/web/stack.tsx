import "server-only";

import { StackServerApp } from "@stackframe/stack";

// Gracefully handle missing Stack project ID in non-auth builds
const hasStackProject = !!process.env.NEXT_PUBLIC_STACK_PROJECT_ID;

type MinimalStackApp = {
  getUser: () => Promise<any>;
  toClientJson: () => any;
};

export const stackServerApp: MinimalStackApp = hasStackProject
  ? (new StackServerApp({ tokenStore: "nextjs-cookie" }) as unknown as MinimalStackApp)
  : {
      // Fallback shim for build/dev without Stack configured
      async getUser() {
        return null;
      },
      toClientJson() {
        return { projectId: null, disabled: true };
      },
    };
