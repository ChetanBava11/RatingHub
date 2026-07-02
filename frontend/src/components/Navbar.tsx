import { Link, useNavigate } from "@tanstack/react-router";
import { clearAuth, getAuth, roleHome } from "@/lib/auth";
import { Btn } from "./ui-kit/Btn";

export function Navbar() {
  const auth = getAuth();
  const navigate = useNavigate();

  const links: { to: string; label: string }[] = [];
  if (auth) {
    links.push({ to: roleHome(auth.user.role), label: "Dashboard" });
    links.push({ to: "/update-password", label: "Update Password" });
  }

  const logout = () => {
    clearAuth();
    navigate({ to: "/" });
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to={auth ? roleHome(auth.user.role) : "/"} className="text-base font-semibold text-foreground">
          Store Rating Platform
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "rounded-md px-3 py-1.5 text-sm text-foreground bg-muted" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {auth ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {auth.user.email} · {auth.user.role}
              </span>
              <Btn variant="secondary" size="sm" onClick={logout}>
                Logout
              </Btn>
            </>
          ) : (
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
