import { AppHeader } from "@/components/shared/app-header";
import { requireClinician } from "@/lib/auth";

export default async function ClinicalLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireClinician();
  return (
    <>
      <AppHeader email={email} />
      {children}
    </>
  );
}
