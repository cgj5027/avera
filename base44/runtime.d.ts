// Platform runtime types for local checking; supplied by Base44 at deployment.
declare module 'base44:runtime' {
  export const secrets: { get(name: string): string | undefined };
}
