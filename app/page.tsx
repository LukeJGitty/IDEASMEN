import { redirect } from "next/navigation";
import { isConfigured } from "@/lib/config";

// The app starts at the patient list. The proxy sends signed-out visitors to /login,
// and /login explains the setup when Supabase is not configured yet.
export default function Home() {
  redirect(isConfigured() ? "/patients" : "/login");
}
