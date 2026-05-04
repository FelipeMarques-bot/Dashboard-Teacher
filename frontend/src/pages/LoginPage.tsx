import { FormEvent, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { motion } from "framer-motion";

import { api, clearAccessToken, setAccessToken } from "../lib/api";
import { getFirebaseAuth, getMissingFirebaseConfigKeys, isFirebaseConfigured } from "../lib/firebase";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

function getGoogleAuthErrorMessage(err: unknown): string {
  const error = err as {
    code?: string;
    message?: string;
    response?: { data?: { detail?: string } };
  };

  const backendDetail = error?.response?.data?.detail;
  if (backendDetail) {
    return backendDetail;
  }

  if (error?.code === "auth/unauthorized-domain") {
    const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
    return [
      "Dominio nao autorizado no Firebase para login Google.",
      currentHost ? `Adicione este dominio nos Authorized domains: ${currentHost}` : "",
      "Firebase Console > Authentication > Settings > Authorized domains.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  const firebaseCode = error?.code ? `(${error.code})` : "";
  const firebaseMessage = error?.message || "";
  return (
    ["Falha no login Google.", firebaseCode, firebaseMessage].filter(Boolean).join(" ") ||
    "Falha no login Google. Confira configuracao do Firebase e backend."
  );
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firebaseReady = isFirebaseConfigured();
  const missingFirebaseKeys = getMissingFirebaseConfigKeys();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    clearAccessToken();

    try {
      const { data } = await api.post("/auth/login/", { username, password });
      setAccessToken(data.access);
      onLoginSuccess();
    } catch {
      setError("Credenciais invalidas. Verifique usuario e senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!firebaseReady) {
      setError(`Firebase nao configurado no frontend. Variaveis faltando: ${missingFirebaseKeys.join(", ")}`);
      return;
    }

    setGoogleLoading(true);
    setError(null);
    clearAccessToken();

    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const { data } = await api.post("/auth/google/", { id_token: idToken });
      setAccessToken(data.access);
      onLoginSuccess();
    } catch (err: unknown) {
      setError(getGoogleAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-aurora" aria-hidden="true" />
      <div className="login-aurora login-aurora-right" aria-hidden="true" />

      <motion.div
        className="login-shell"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.aside
          className="login-brand-panel"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <p className="login-brand-tag">Plataforma Docente</p>
          <h1>Dashboard Teacher</h1>
          <p>Planejamento, calendario, turmas e avaliacoes em um painel unico para sua escola.</p>
          <ul>
            <li>Agenda academica consolidada</li>
            <li>Importacao de dados via planilhas</li>
            <li>Integracao com Google e notificacoes</li>
          </ul>
        </motion.aside>

        <motion.form
          className="login-card"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18, duration: 0.45 }}
        >
          <h2>Entrar</h2>
          <p>Use sua conta da plataforma ou Google.</p>

          <button className="btn-google" type="button" onClick={handleGoogleLogin} disabled={googleLoading || !firebaseReady}>
            {googleLoading ? "Conectando Google..." : "Continuar com Google"}
          </button>

          {!firebaseReady ? (
            <p style={{ marginTop: 10, fontSize: "0.92rem", opacity: 0.9 }}>
              Firebase nao configurado. Defina no ambiente: {missingFirebaseKeys.join(", ")}.
            </p>
          ) : null}

          <div className="login-divider">ou</div>

          <label>
            Usuario
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu usuario"
              required
            />
          </label>

          <label>
            Senha
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
