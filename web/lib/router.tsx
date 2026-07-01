import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface RouterState {
  path: string;
  params: Record<string, string>;
  searchParams: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean; state?: any }) => void;
}

const RouterContext = createContext<RouterState | null>(null);

export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));

  useEffect(() => {
    function handlePop() {
      setPath(window.location.pathname);
      setSearchParams(new URLSearchParams(window.location.search));
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean; state?: any }) => {
    if (opts?.replace) {
      window.history.replaceState(opts?.state ?? null, "", to);
    } else {
      window.history.pushState(opts?.state ?? null, "", to);
    }
    setPath(to.split("?")[0]);
    setSearchParams(new URLSearchParams(to.includes("?") ? to.split("?")[1] : ""));
  }, []);

  return (
    <RouterContext.Provider value={{ path, params: {}, searchParams, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useNavigate() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useNavigate must be used within Router");
  return ctx.navigate;
}

export function useLocation() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useLocation must be used within Router");
  return { pathname: ctx.path, search: ctx.searchParams.toString(), state: window.history.state };
}

export function useParams<T extends Record<string, string>>(): T {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useParams must be used within Router");
  return ctx.params as T;
}

export function useSearchParams(): [URLSearchParams, (params: URLSearchParams) => void] {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useSearchParams must be used within Router");
  const setParams = useCallback((p: URLSearchParams) => {
    const newUrl = `${ctx.path}?${p.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [ctx.path]);
  return [ctx.searchParams, setParams];
}

function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = pathname.split("/").filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export interface RouteConfig {
  path: string;
  element: ReactNode;
  children?: RouteConfig[];
}

function resolveRoutes(routes: RouteConfig[], basePath: string, pathname: string, ctx: RouterState): ReactNode | null {
  for (const route of routes) {
    const fullPath = route.path === "" ? basePath : `${basePath}/${route.path}`.replace(/\/+/g, "/");

    if (route.children) {
      const prefixMatch = pathname === fullPath || pathname.startsWith(fullPath + "/");
      if (prefixMatch) {
        const childResult = resolveRoutes(route.children, fullPath, pathname, ctx);
        if (childResult) {
          return (
            <ParentWithOutlet parent={route.element}>
              {childResult}
            </ParentWithOutlet>
          );
        }
      }
    } else {
      const params = matchPath(fullPath, pathname);
      if (params) {
        return (
          <RouterContext.Provider value={{ ...ctx, params }}>
            {route.element}
          </RouterContext.Provider>
        );
      }
    }
  }
  return null;
}

export function Routes({ routes }: { routes: RouteConfig[] }) {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("Routes must be used within Router");

  const result = resolveRoutes(routes, "", ctx.path, ctx);
  return <>{result}</>;
}

const OutletContext = createContext<ReactNode>(null);

function ParentWithOutlet({ parent, children }: { parent: ReactNode; children: ReactNode }) {
  return <OutletContext.Provider value={children}>{parent}</OutletContext.Provider>;
}

export function Outlet() {
  return <>{useContext(OutletContext)}</>;
}

export function Link({ to, className, style, children }: {
  to: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <a
      href={to}
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function NavLink({ to, end, className, children }: {
  to: string;
  end?: boolean;
  className?: string | ((props: { isActive: boolean }) => string);
  children: ReactNode;
}) {
  const { path } = useContext(RouterContext)!;
  const isActive = end ? path === to : (path === to || path.startsWith(to + "/"));
  const cls = typeof className === "function" ? className({ isActive }) : className;

  const navigate = useNavigate();
  return (
    <a
      href={to}
      className={cls}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: any }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [to, replace]);
  return null;
}
