import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURATION – hier deine Werte eintragen:
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  WEDDING_NAME: "Mark & Kati",
  WEDDING_DATE: "2025",
  // 1. Google Cloud Console → APIs & Dienste → Anmeldedaten → OAuth 2.0 Client-ID
  GOOGLE_CLIENT_ID: "647082584550-4i2lju63uos83mjhithh6eshq1unf2i8.apps.googleusercontent.com",
  // 2. Die ID des Google Drive Ordners (aus der URL: drive.google.com/drive/folders/DIESE_ID)
  DRIVE_FOLDER_ID: "1dDph5w6TI8DH1UuPE06RygrFP56p14cJ",
  // Admin-Passwort
  ADMIN_PASSWORD: "MarkUndKati2025",
};
// ─────────────────────────────────────────────────────────────────────────────

const SCOPES = "https://www.googleapis.com/auth/drive.file";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

// ── Google OAuth ──────────────────────────────────────────────────────────────

let gapiReady = false;

async function loadGoogleScripts() {
  if (gapiReady) return;
  await new Promise((resolve) => {
    const gsi = document.createElement("script");
    gsi.src = "https://accounts.google.com/gsi/client";
    gsi.onload = () => {
      const gapi = document.createElement("script");
      gapi.src = "https://apis.google.com/js/api.js";
      gapi.onload = resolve;
      document.head.appendChild(gapi);
    };
    document.head.appendChild(gsi);
  });
  await new Promise((res) => window.gapi.load("client", res));
  await window.gapi.client.init({ discoveryDocs: [DISCOVERY_DOC] });
  gapiReady = true;
}

async function getAccessToken(clientId) {
  await loadGoogleScripts();
  return new Promise((resolve, reject) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => resp.error ? reject(new Error(resp.error)) : resolve(resp.access_token),
    });
    tc.requestAccessToken({ prompt: "consent" });
  });
}

async function uploadFileToDrive(file, guestName, message, folderId, token) {
  const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
  const safe = guestName.replace(/[^a-zA-ZäöüÄÖÜß0-9 ]/g, "").replace(/\s+/g, "_");
  const ext = file.name.split(".").pop();
  const name = `${safe}_${ts}.${ext}`;

  const meta = { name, parents: [folderId], description: `Gast: ${guestName}${message ? `\nNachricht: ${message}` : ""}` };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", file);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

// ── Components ────────────────────────────────────────────────────────────────

function Petals() {
  const items = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 7.3) % 100}%`,
    delay: `${(i * 0.85) % 8}s`,
    dur: `${6 + (i % 5)}s`,
    size: `${10 + (i % 4) * 5}px`,
    op: 0.1 + (i % 6) * 0.06,
  }));
  return (
    <>
      {items.map((s, i) => (
        <div key={i} style={{
          position: "fixed", top: -20, left: s.left, fontSize: s.size, opacity: s.op,
          pointerEvents: "none", zIndex: 0,
          animation: `petalFall ${s.dur} ${s.delay} linear infinite`,
        }}>🌸</div>
      ))}
    </>
  );
}

function Divider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.4rem 0" }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#d4b896,transparent)" }} />
      <span style={{ color: "#c9a87c" }}>🌸</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,#d4b896,transparent)" }} />
    </div>
  );
}

function Preview({ file, status }) {
  const url = URL.createObjectURL(file);
  const isVid = file.type.startsWith("video/");
  const icon = { waiting: "⏳", uploading: "⬆️", done: "✅", error: "❌" }[status] || "⏳";
  const borderColor = status === "done" ? "#7cb87c" : status === "error" ? "#e07878" : "rgba(201,168,124,0.35)";
  return (
    <div style={{ position: "relative", width: 72, height: 72, borderRadius: 10, overflow: "hidden", border: `2px solid ${borderColor}` }}>
      {isVid
        ? <video src={url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
        : <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      <div style={{ position: "absolute", bottom: 2, right: 3, fontSize: "0.85rem", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>{icon}</div>
    </div>
  );
}

function SetupWarning() {
  if (CONFIG.GOOGLE_CLIENT_ID !== "DEINE_CLIENT_ID.apps.googleusercontent.com") return null;
  return (
    <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 12, padding: "1rem", marginBottom: "1.2rem", fontSize: "0.82rem", color: "#7a5c00", lineHeight: 1.7 }}>
      <strong>⚙️ Noch nicht konfiguriert</strong><br />
      Trage im Code deine <code>GOOGLE_CLIENT_ID</code> und <code>DRIVE_FOLDER_ID</code> ein.<br />
      <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: "#7a5c00", fontWeight: 500 }}>→ Google Cloud Console</a>
    </div>
  );
}

// ── Guest View ────────────────────────────────────────────────────────────────

function GuestView({ onSuccess, onAdmin }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [tapCount, setTapCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const setSt = (fname, s) => setStatuses((p) => ({ ...p, [fname]: s }));

  const addFiles = (incoming) => {
    const ok = incoming.filter((f) => f.size <= 50 * 1024 * 1024);
    const big = incoming.filter((f) => f.size > 50 * 1024 * 1024);
    if (big.length) setError(`${big.length} Datei(en) überschreiten 50 MB und wurden übersprungen.`);
    else setError("");
    setFiles((p) => [...p, ...ok]);
  };

  const handleUpload = async () => {
    if (!name.trim() || !files.length) return;
    setError("");
    setUploading(true);
    try {
      const token = await getAccessToken(CONFIG.GOOGLE_CLIENT_ID);
      let anyOk = false;
      for (const f of files) {
        setSt(f.name, "uploading");
        try {
          await uploadFileToDrive(f, name, msg, CONFIG.DRIVE_FOLDER_ID, token);
          setSt(f.name, "done");
          anyOk = true;
        } catch (e) {
          setSt(f.name, "error");
          setError(`Fehler bei "${f.name}": ${e.message}`);
        }
      }
      if (anyOk) onSuccess({ name, count: files.filter((_, i) => statuses[files[i]?.name] !== "error").length || files.length });
    } catch (e) {
      setError("Google-Anmeldung fehlgeschlagen oder abgebrochen.");
    }
    setUploading(false);
  };

  const tapTitle = () => { if (++tapCount >= 5) { setTapCount(0); onAdmin(); } };

  return (
    <div style={S.card}>
      <SetupWarning />
      <div style={S.ornament}>✦ ✦ ✦</div>
      <h1 style={S.title} onClick={tapTitle}>Mark <em style={{ fontStyle: "italic", color: "#b07d4e" }}>&amp;</em> Kati</h1>
      <p style={S.sub}>Digitales Gästebuch · {CONFIG.WEDDING_DATE}</p>
      <Divider />
      <p style={{ textAlign: "center", color: "#7a6a5a", fontSize: "0.88rem", lineHeight: 1.8 }}>
        Schieß ein Foto oder ein kurzes Video und<br />lass es Teil unserer Erinnerung werden. 💕
      </p>

      <label style={S.label}>Dein Name *</label>
      <input style={S.input} type="text" placeholder="z. B. Anna & Thomas" value={name}
        onChange={(e) => setName(e.target.value)} disabled={uploading} />

      <label style={S.label}>Nachricht (optional)</label>
      <textarea style={{ ...S.input, minHeight: 80, resize: "vertical" }}
        placeholder="Alles Gute für euren gemeinsamen Weg …"
        value={msg} onChange={(e) => setMsg(e.target.value)} disabled={uploading} />

      <label style={S.label}>Fotos & Videos * (max. 50 MB)</label>
      <div
        style={{ ...S.zone, ...(dragOver ? S.zoneHover : {}), ...(uploading ? { opacity: 0.5, pointerEvents: "none" } : {}) }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
      >
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple style={{ display: "none" }}
          onChange={(e) => addFiles(Array.from(e.target.files))} />
        <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>📷</div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", color: "#6b5744" }}>Tippen zum Auswählen</p>
        <p style={{ fontSize: "0.73rem", color: "#b8a898", marginTop: "0.3rem" }}>oder Dateien hierher ziehen · JPG, PNG, MP4, MOV …</p>
      </div>

      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "1rem" }}>
          {files.map((f) => <Preview key={f.name + f.size} file={f} status={statuses[f.name] || "waiting"} />)}
        </div>
      )}

      {error && <p style={{ color: "#c05050", fontSize: "0.82rem", marginTop: "0.8rem", lineHeight: 1.5 }}>⚠️ {error}</p>}

      <button style={{ ...S.btn, ...(!name.trim() || !files.length || uploading ? S.btnOff : {}) }}
        disabled={!name.trim() || !files.length || uploading} onClick={handleUpload}>
        {uploading ? "Wird hochgeladen …" : "💌 Absenden & speichern"}
      </button>

      <p style={{ textAlign: "center", fontSize: "0.7rem", color: "#c9a87c", marginTop: "0.7rem" }}>
        🔒 Direkt in unseren Google Drive – sicher & privat
      </p>
    </div>
  );
}

// ── Success View ──────────────────────────────────────────────────────────────

function SuccessView({ data, onReset }) {
  return (
    <div style={S.card}>
      <div style={S.ornament}>✦ ✦ ✦</div>
      <div style={{ fontSize: "3.5rem", textAlign: "center", margin: "1rem 0" }}>🎉</div>
      <h2 style={{ ...S.title, fontSize: "2rem" }}>Vielen Dank!</h2>
      <Divider />
      <p style={{ textAlign: "center", color: "#7a6a5a", fontSize: "0.9rem", lineHeight: 1.9 }}>
        <strong style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.15rem" }}>{data.name}</strong><br />
        {data.count === 1 ? "Dein Beitrag wurde" : `Deine ${data.count} Dateien wurden`} in unserem<br />
        Gästebuch gespeichert. Wir freuen uns riesig! 💕
      </p>
      <button style={S.btn} onClick={onReset}>Noch ein Foto hochladen</button>
    </div>
  );
}

// ── Admin View ────────────────────────────────────────────────────────────────

function AdminView({ onBack }) {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const check = () => pw === CONFIG.ADMIN_PASSWORD && setOk(true);

  return (
    <div style={S.card}>
      <h2 style={{ ...S.title, fontSize: "1.9rem" }}>Admin</h2>
      <p style={S.sub}>Nur für Mark & Kati</p>
      <Divider />
      {!ok ? (
        <>
          <label style={S.label}>Passwort</label>
          <input style={S.input} type="password" placeholder="••••••••" value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()} />
          <button style={S.btn} onClick={check}>Entsperren</button>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={onBack}>← Zurück</button>
        </>
      ) : (
        <>
          <p style={{ color: "#7a6a5a", fontSize: "0.88rem", lineHeight: 1.8, textAlign: "center" }}>
            Alle Fotos & Videos befinden sich direkt<br />in eurem Google Drive Ordner:
          </p>
          <a href={`https://drive.google.com/drive/folders/${CONFIG.DRIVE_FOLDER_ID}`}
            target="_blank" rel="noreferrer"
            style={{ ...S.btn, display: "block", textAlign: "center", textDecoration: "none" }}>
            📂 Google Drive öffnen
          </a>
          <button style={{ ...S.btn, ...S.btnGhost }} onClick={onBack}>← Zur Upload-Seite</button>
        </>
      )}
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("guest");
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@300;400&display=swap');
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      @keyframes petalFall{0%{transform:translateY(-20px) rotate(0deg);opacity:0}10%{opacity:1}90%{opacity:.8}100%{transform:translateY(110vh) rotate(360deg);opacity:0}}
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg,#fdf9f3 0%,#f5ede0 50%,#faf3eb 100%)",
      fontFamily: "'Jost',sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "2rem 1rem 4rem", position: "relative", overflow: "hidden",
    }}>
      <Petals />
      {view === "guest" && <GuestView onSuccess={(d) => { setSuccessData(d); setView("success"); }} onAdmin={() => setView("admin")} />}
      {view === "success" && <SuccessView data={successData} onReset={() => setView("guest")} />}
      {view === "admin" && <AdminView onBack={() => setView("guest")} />}
    </div>
  );
}

// ── Style tokens ──────────────────────────────────────────────────────────────

const S = {
  card: { background: "rgba(255,255,255,.72)", backdropFilter: "blur(12px)", border: "1px solid rgba(210,180,150,.3)", borderRadius: 24, padding: "2.5rem 2rem", maxWidth: 480, width: "100%", position: "relative", zIndex: 1, boxShadow: "0 8px 40px rgba(180,140,100,.12)" },
  ornament: { textAlign: "center", fontSize: "1.4rem", letterSpacing: ".4em", color: "#c9a87c", marginBottom: ".5rem" },
  title: { fontFamily: "'Cormorant Garamond',serif", fontSize: "2.6rem", fontWeight: 300, color: "#3a2e24", textAlign: "center", lineHeight: 1.15, cursor: "default", userSelect: "none" },
  sub: { textAlign: "center", fontSize: ".78rem", fontWeight: 300, letterSpacing: ".18em", color: "#9e8a76", marginTop: ".4rem", textTransform: "uppercase" },
  label: { display: "block", fontSize: ".72rem", letterSpacing: ".15em", color: "#9e8a76", textTransform: "uppercase", marginBottom: ".4rem", marginTop: "1.2rem" },
  input: { width: "100%", background: "rgba(255,255,255,.6)", border: "1px solid rgba(200,170,130,.4)", borderRadius: 10, padding: ".75rem 1rem", fontFamily: "'Jost',sans-serif", fontSize: ".95rem", fontWeight: 300, color: "#3a2e24", outline: "none" },
  zone: { marginTop: ".5rem", border: "2px dashed rgba(201,168,124,.5)", borderRadius: 16, padding: "1.8rem 1rem", textAlign: "center", cursor: "pointer", background: "rgba(255,248,240,.5)", transition: "all .2s" },
  zoneHover: { borderColor: "#c9a87c", background: "rgba(255,248,240,.9)", transform: "scale(1.01)" },
  btn: { display: "block", width: "100%", marginTop: "1.4rem", padding: ".9rem", background: "linear-gradient(135deg,#c9a87c,#b07d4e)", color: "white", border: "none", borderRadius: 12, fontFamily: "'Jost',sans-serif", fontSize: ".85rem", letterSpacing: ".12em", cursor: "pointer", boxShadow: "0 4px 20px rgba(176,125,78,.35)" },
  btnOff: { opacity: .5, cursor: "not-allowed" },
  btnGhost: { background: "transparent", color: "#9e8a76", border: "1px solid rgba(201,168,124,.4)", boxShadow: "none", marginTop: ".8rem" },
};
