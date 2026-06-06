import { createFileRoute, redirect } from "@tanstack/react-router";

// Settings is hidden — the tab was removed from the sidebar and the page now
// redirects home. Adoption sync runs via the scheduled GitHub Action; user
// sign-out lives in the sidebar. Re-expose this page by restoring a component
// and re-adding the nav entry in src/components/layout/AppShell.tsx.
export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
