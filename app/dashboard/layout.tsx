import { redirect } from "next/navigation";
import { createServerClient } from "@/utils/supabase/server";
import { Navbar } from "./navbar";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

type ProfileRow = {
  id: string;
  role: string | null;
};

type DashboardUserContext = {
  email: string | null;
  role: "admin" | "user";
};

async function getDashboardUserContext(): Promise<DashboardUserContext> {
  const supabase = await createServerClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    throw new Error("No se pudo validar el perfil del usuario.");
  }

  return {
    email: user.email ?? null,
    role: profile?.role === "admin" ? "admin" : "user"
  };
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { email, role } = await getDashboardUserContext();

  return (
    <div className="min-h-svh bg-slate-50">
      <Navbar email={email} role={role} />
      {children}
    </div>
  );
}
