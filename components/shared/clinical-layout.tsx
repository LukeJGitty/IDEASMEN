import { AppHeader } from "@/components/shared/app-header";
import { requireClinician } from "@/lib/auth";
import { countMyOpenTasks } from "@/lib/data/tasks";

/** Shared shell for every signed-in clinical section: auth check plus the Hippo header. */
export async function ClinicalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, email, userId } = await requireClinician();
  const openTasks = await countMyOpenTasks(supabase, userId);
  return (
    <>
      <AppHeader email={email} openTasks={openTasks} />
      {children}
    </>
  );
}
