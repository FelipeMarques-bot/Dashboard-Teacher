import { AnimatePresence, motion } from "framer-motion";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

const AssessmentsPage = lazy(() => import("./pages/AssessmentsPage").then((module) => ({ default: module.AssessmentsPage })));
const CalendarPage = lazy(() => import("./pages/CalendarPage").then((module) => ({ default: module.CalendarPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const StudentsPage = lazy(() => import("./pages/StudentsPage").then((module) => ({ default: module.StudentsPage })));
const TurmasPage = lazy(() => import("./pages/TurmasPage").then((module) => ({ default: module.TurmasPage })));
import { api, clearAccessToken, getAccessToken } from "./lib/api";

type NavKey = "inicio" | "calendario" | "turmas" | "avaliacoes" | "alunos" | "relatorios" | "configuracoes";

const navItems: Array<{ key: NavKey; label: string }> = [
  { key: "inicio", label: "Início" },
  { key: "calendario", label: "Calendário" },
  { key: "turmas", label: "Turmas" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "alunos", label: "Alunos" },
  { key: "relatorios", label: "Relatórios" },
  { key: "configuracoes", label: "Configurações" },
];

type MeResponse = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
};

type StudentSearchRow = {
  id: number;
  full_name: string;
  class_group_name: string;
};

type ClassGroupSearchRow = {
  id: number;
  name: string;
  school_name: string;
};

type SearchItem = {
  id: string;
  kind: "student" | "class";
  title: string;
  subtitle: string;
};

function listFromResponse<T>(payload: T[] | { results?: T[] }): T[] {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
}

function ContentFallback() {
  return (
    <div className="panel">
      <h2>Carregando seção...</h2>
      <p>Aguarde enquanto os módulos são preparados.</p>
    </div>
  );
}

function App() {
  const [active, setActive] = useState<NavKey>("inicio");
  const [user, setUser] = useState<MeResponse | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  const loadSession = async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setCheckingSession(false);
      return;
    }

    try {
      const { data } = await api.get<MeResponse>("/auth/me/");
      setUser(data);
    } catch {
      clearAccessToken();
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(() => {
      const runSearch = async () => {
        setSearching(true);
        try {
          const [studentsResp, classesResp] = await Promise.all([
            api.get<StudentSearchRow[] | { results: StudentSearchRow[] }>("/students/"),
            api.get<ClassGroupSearchRow[] | { results: ClassGroupSearchRow[] }>("/class-groups/"),
          ]);

          const students = listFromResponse(studentsResp.data)
            .filter((item) => item.full_name.toLowerCase().includes(term) || item.class_group_name.toLowerCase().includes(term))
            .slice(0, 4)
            .map((item) => ({
              id: `student-${item.id}`,
              kind: "student" as const,
              title: item.full_name,
              subtitle: `Aluno • ${item.class_group_name}`,
            }));

          const classes = listFromResponse(classesResp.data)
            .filter((item) => item.name.toLowerCase().includes(term) || item.school_name.toLowerCase().includes(term))
            .slice(0, 4)
            .map((item) => ({
              id: `class-${item.id}`,
              kind: "class" as const,
              title: item.name,
              subtitle: `Turma • ${item.school_name}`,
            }));

          setSearchResults([...students, ...classes].slice(0, 7));
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      };

      void runSearch();
    }, 220);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLoginSuccess = async () => {
    setCheckingSession(true);
    await loadSession();
  };

  const handleLogout = () => {
    clearAccessToken();
    setUser(null);
    setActive("inicio");
  };

  const handleSearchSelect = (item: SearchItem) => {
    setSearchTerm(item.title);
    setSearchResults([]);
    setActive(item.kind === "student" ? "alunos" : "turmas");
  };

  const content = useMemo(() => {
    if (active === "calendario") return <CalendarPage />;
    if (active === "turmas") return <TurmasPage externalQuery={searchTerm} />;
    if (active === "avaliacoes") return <AssessmentsPage />;
    if (active === "alunos") return <StudentsPage externalQuery={searchTerm} />;
    if (active === "relatorios") return <ReportsPage />;
    if (active === "configuracoes") return <SettingsPage />;
    const displayName = user?.first_name || user?.username || "Professor";
    return (
      <DashboardPage
        displayName={displayName}
        onLaunchGrades={() => setActive("turmas")}
        onViewHistory={() => setActive("relatorios")}
      />
    );
  }, [active, user, searchTerm]);

  if (checkingSession) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Dashboard Teacher</h1>
          <p>Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="portal-root">
      <aside className="sidebar">
        <div className="brand-block">
          <strong>Dashboard Teacher</strong>
          <span>Ambiente Docente</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === active ? "nav-item active" : "nav-item"}
              onClick={() => setActive(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="#">Suporte</a>
          <button className="btn-secondary" type="button" onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-meta">
            <span>Portal do Professor</span>
            <small>Segunda-feira, 14 de Outubro</small>
          </div>
          <div className="search-shell">
            <input
              placeholder="Buscar aluno ou turma"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            {searchTerm.trim().length >= 2 ? (
              <div className="search-popover">
                {searching ? <p>Buscando...</p> : null}
                {!searching && searchResults.length === 0 ? <p>Nenhum resultado.</p> : null}
                {!searching
                  ? searchResults.map((item) => (
                      <button key={item.id} type="button" className="search-result" onClick={() => handleSearchSelect(item)}>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle}</span>
                      </button>
                    ))
                  : null}
              </div>
            ) : null}
          </div>
          <button className="btn-secondary topbar-logout" type="button" onClick={handleLogout}>Sair</button>
          <div className="profile">{(user.first_name || user.username).slice(0, 2).toUpperCase()}</div>
        </header>
        <section className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Suspense fallback={<ContentFallback />}>
                {content}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

export default App;
