import { useEffect, useState, useRef, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_URL = "https://ems-zagv.onrender.com/employees";

const DEPARTMENTS = [
  "Engineering","Design","Product","Marketing",
  "Sales","HR","Finance","Operations","DevOps","Data Science",
];

const DEPT_META = {
  Engineering:  { color: "#7c3aed", light: "#ede9fe", icon: "⚙️" },
  Design:       { color: "#db2777", light: "#fce7f3", icon: "🎨" },
  Product:      { color: "#0891b2", light: "#cffafe", icon: "📦" },
  Marketing:    { color: "#d97706", light: "#fef3c7", icon: "📣" },
  Sales:        { color: "#059669", light: "#d1fae5", icon: "💼" },
  HR:           { color: "#dc2626", light: "#fee2e2", icon: "🧑‍🤝‍🧑" },
  Finance:      { color: "#2563eb", light: "#dbeafe", icon: "💹" },
  Operations:   { color: "#7c3aed", light: "#ede9fe", icon: "🔧" },
  DevOps:       { color: "#0d9488", light: "#ccfbf1", icon: "🚀" },
  "Data Science":{ color: "#9333ea", light: "#f3e8ff", icon: "📊" },
};

const STATUS_META = {
  Active:   { color: "#10b981", bg: "rgba(16,185,129,0.15)", dot: "#10b981" },
  Leave:    { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  dot: "#f59e0b" },
  Resigned: { color: "#ef4444", bg: "rgba(239,68,68,0.15)",   dot: "#ef4444" },
};

const ROLES = ["Senior Engineer","Engineer","Lead","Manager","Director","Intern","Analyst","Specialist","Consultant","Architect"];
const AVATARS = ["🧑‍💻","👩‍💼","👨‍🎨","👩‍🔬","👨‍💻","👩‍🏫","🧑‍🔧","👩‍💻","👨‍💼","🧑‍🎨"];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

function getAvatar(name) { return AVATARS[hashCode(name || "E") % AVATARS.length]; }
function getRole(name)   { return ROLES[hashCode(name || "R") % ROLES.length]; }
function getStatus(id)   { const s = ["Active","Active","Active","Leave","Resigned"]; return s[id % 5] || "Active"; }
function getJoinDate(id) {
  const y = 2020 + (id % 4);
  const m = String((id % 12) + 1).padStart(2,"0");
  return `${y}-${m}-01`;
}
function getEmpId(id) { return `EMP-${String(1000 + id).padStart(4,"0")}`; }

function fmtCurrency(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

function useMouseOrb(ref) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = (e) => {
      const r = el.getBoundingClientRect();
      setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("mousemove", handle);
    return () => el.removeEventListener("mousemove", handle);
  }, []);
  return pos;
}

// ─── Tilt Card ────────────────────────────────────────────────────────────────
function TiltCard({ children, style, className }) {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale3d(1.02,1.02,1.02)`;
    el.style.boxShadow = `${-x * 20}px ${-y * 20}px 40px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.1)`;
  };
  const handleLeave = (e) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)";
    el.style.boxShadow = "";
  };
  return (
    <div ref={ref} style={{ transition: "transform 0.12s ease, box-shadow 0.12s ease", ...style }}
      className={className}
      onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "13px 20px",
          borderRadius: 14,
          fontSize: 13,
          fontWeight: 600,
          backdropFilter: "blur(20px)",
          background: t.type === "error"
            ? "rgba(239,68,68,0.15)"
            : t.type === "warn"
            ? "rgba(245,158,11,0.15)"
            : "rgba(16,185,129,0.15)",
          border: `1px solid ${t.type === "error" ? "rgba(239,68,68,0.4)" : t.type === "warn" ? "rgba(245,158,11,0.4)" : "rgba(16,185,129,0.4)"}`,
          color: t.type === "error" ? "#f87171" : t.type === "warn" ? "#fbbf24" : "#34d399",
          animation: "slideInRight 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{t.type === "error" ? "✕" : t.type === "warn" ? "⚠" : "✓"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return [toasts, show];
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 80, h = 30;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── MiniBarChart ─────────────────────────────────────────────────────────────
function MiniBar({ label, value, max, color }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#94a3b8", marginBottom:4 }}>
        <span>{label}</span><span style={{ color:"#e2e8f0", fontWeight:600 }}>{value}</span>
      </div>
      <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:4,
          transition:"width 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
      </div>
    </div>
  );
}

// ─── PieChart (SVG) ───────────────────────────────────────────────────────────
function PieChart({ data }) {
  const total = data.reduce((s,d) => s + d.value, 0) || 1;
  let cum = 0;
  const cx = 60, cy = 60, r = 50, ri = 28;
  const slices = data.map((d, i) => {
    const start = (cum / total) * 2 * Math.PI - Math.PI / 2;
    cum += d.value;
    const end = (cum / total) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    const xi1 = cx + ri * Math.cos(start), yi1 = cy + ri * Math.sin(start);
    const xi2 = cx + ri * Math.cos(end),   yi2 = cy + ri * Math.sin(end);
    const large = d.value / total > 0.5 ? 1 : 0;
    return (
      <path key={i}
        d={`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ri} ${ri} 0 ${large} 0 ${xi1} ${yi1} Z`}
        fill={d.color} opacity={0.9}
        style={{ transition: "all 0.3s" }} />
    );
  });
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      {slices}
      <circle cx={cx} cy={cy} r={ri - 2} fill="#0f172a" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="11" fill="#e2e8f0" fontWeight="600">{data.length}</text>
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = 16, r = 8, style = {} }) {
  return (
    <div style={{ width:w, height:h, borderRadius:r, background:"rgba(255,255,255,0.05)",
      backgroundImage:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)",
      backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite", ...style }} />
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ open, name, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000 }}>
      <div style={{
        background:"rgba(15,23,42,0.95)", border:"1px solid rgba(139,92,246,0.3)",
        borderRadius:24, padding:"36px 40px", maxWidth:380, width:"90%", textAlign:"center",
        boxShadow:"0 40px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.1)",
        animation:"modalPop 0.25s cubic-bezier(0.175,0.885,0.32,1.275)",
      }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🗑️</div>
        <h3 style={{ color:"#f1f5f9", fontSize:20, fontWeight:700, marginBottom:8 }}>Remove employee?</h3>
        <p style={{ color:"#64748b", fontSize:14, marginBottom:28 }}>
          <strong style={{ color:"#94a3b8" }}>{name}</strong> will be permanently removed from the system.
        </p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"11px 0", borderRadius:12,
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#94a3b8", fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex:1, padding:"11px 0", borderRadius:12,
            background:"rgba(239,68,68,0.2)", border:"1px solid rgba(239,68,68,0.4)",
            color:"#f87171", fontSize:14, fontWeight:600, cursor:"pointer" }}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── Employee Form Modal ───────────────────────────────────────────────────────
function EmployeeFormModal({ open, editData, onClose, onSave }) {
  const [form, setForm] = useState({ name:"", department:"", salary:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editData) setForm({ name: editData.name, department: editData.department, salary: String(editData.salary) });
    else setForm({ name:"", department:"", salary:"" });
  }, [editData, open]);

  if (!open) return null;

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form, editData?.id ?? null);
    setSaving(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(12px)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background:"rgba(15,23,42,0.98)", border:"1px solid rgba(139,92,246,0.3)",
        borderRadius:28, padding:"40px 36px", maxWidth:440, width:"92%",
        boxShadow:"0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(139,92,246,0.15)",
        animation:"modalPop 0.28s cubic-bezier(0.175,0.885,0.32,1.275)",
      }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
          <div>
            <div style={{ fontSize:11, letterSpacing:2, color:"#7c3aed", fontWeight:700, textTransform:"uppercase", marginBottom:4 }}>
              {editData ? "Edit Profile" : "New Employee"}
            </div>
            <h2 style={{ color:"#f1f5f9", fontSize:22, fontWeight:800, margin:0 }}>
              {editData ? `Update ${editData.name.split(" ")[0]}` : "Add to your team"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:"50%",
            background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
            color:"#64748b", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
        </div>

        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { label:"Full name", name:"name", type:"text", ph:"e.g. Priya Sharma" },
            { label:"Monthly salary (₹)", name:"salary", type:"number", ph:"e.g. 85000" },
          ].map(f => (
            <div key={f.name}>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"#475569",
                textTransform:"uppercase", display:"block", marginBottom:8 }}>{f.label}</label>
              <input type={f.type} name={f.name} placeholder={f.ph} value={form[f.name]}
                onChange={handle} required style={inputStyle} />
            </div>
          ))}

          <div>
            <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"#475569",
              textTransform:"uppercase", display:"block", marginBottom:8 }}>Department</label>
            <select name="department" value={form.department} onChange={handle} required style={inputStyle}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:8 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14,
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#64748b", fontSize:14, fontWeight:600, cursor:"pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2, padding:"13px 0", borderRadius:14,
              background: saving ? "rgba(139,92,246,0.4)" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
              border:"none", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer",
              boxShadow: saving ? "none" : "0 0 30px rgba(139,92,246,0.4)" }}>
              {saving ? "Saving…" : editData ? "Save changes" : "Add employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  color: "#f1f5f9",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

// ─── Employee Card ────────────────────────────────────────────────────────────
function EmployeeCard({ emp, onEdit, onDelete, selected, onSelect }) {
  const meta  = DEPT_META[emp.department] || DEPT_META.Engineering;
  const sData = STATUS_META[getStatus(emp.id)];
  const role  = getRole(emp.name);
  const eid   = getEmpId(emp.id);

  return (
    <TiltCard style={{
      background: "rgba(15,23,42,0.8)",
      backdropFilter: "blur(20px)",
      border: selected ? "1px solid rgba(139,92,246,0.7)" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 20,
      padding: "22px 20px",
      cursor: "pointer",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* glow accent top-right */}
      <div style={{ position:"absolute", top:-30, right:-30, width:100, height:100, borderRadius:"50%",
        background: meta.color + "33", filter:"blur(25px)", pointerEvents:"none" }} />

      {/* select checkbox */}
      <div style={{ position:"absolute", top:14, left:14 }}
        onClick={(e) => { e.stopPropagation(); onSelect(emp.id); }}>
        <div style={{
          width:18, height:18, borderRadius:5,
          border: selected ? "2px solid #7c3aed" : "2px solid rgba(255,255,255,0.15)",
          background: selected ? "#7c3aed" : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s",
        }}>
          {selected && <span style={{ color:"#fff", fontSize:11, fontWeight:800 }}>✓</span>}
        </div>
      </div>

      {/* Status */}
      <div style={{ position:"absolute", top:14, right:14,
        display:"flex", alignItems:"center", gap:5,
        background: sData.bg, borderRadius:20, padding:"3px 10px" }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:sData.dot,
          boxShadow:`0 0 6px ${sData.dot}` }} />
        <span style={{ fontSize:11, fontWeight:600, color:sData.color }}>
          {getStatus(emp.id)}
        </span>
      </div>

      {/* Avatar */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:16, marginTop:8 }}>
        <div style={{ width:60, height:60, borderRadius:"50%",
          background:`linear-gradient(135deg, ${meta.color}44, ${meta.color}88)`,
          border:`2px solid ${meta.color}66`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:28,
          marginBottom:10, boxShadow:`0 0 20px ${meta.color}44` }}>
          {getAvatar(emp.name)}
        </div>
        <h3 style={{ color:"#f1f5f9", fontSize:15, fontWeight:700, margin:0, textAlign:"center" }}>{emp.name}</h3>
        <p style={{ color:"#64748b", fontSize:12, margin:"3px 0 0", textAlign:"center" }}>{role}</p>
        <p style={{ color:"#475569", fontSize:11, margin:"2px 0 0", fontFamily:"monospace" }}>{eid}</p>
      </div>

      {/* Dept badge */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
        <span style={{
          background: meta.color + "22", color: meta.color,
          border: `1px solid ${meta.color}44`,
          borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700,
          letterSpacing:0.5, textTransform:"uppercase",
        }}>{meta.icon} {emp.department}</span>
      </div>

      {/* Salary */}
      <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px",
        display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:11, color:"#475569", fontWeight:600 }}>SALARY / MO</span>
        <span style={{ fontSize:15, color:"#a78bfa", fontWeight:700 }}>
          {fmtCurrency(emp.salary)}
        </span>
      </div>

      {/* Join date */}
      <div style={{ fontSize:11, color:"#334155", textAlign:"center", marginBottom:14 }}>
        Joined {new Date(getJoinDate(emp.id)).toLocaleDateString("en-IN",{ year:"numeric", month:"short" })}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={(e) => { e.stopPropagation(); onEdit(emp); }}
          style={{ flex:1, padding:"9px 0", borderRadius:10,
            background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)",
            color:"#818cf8", fontSize:12, fontWeight:700, cursor:"pointer",
            transition:"all 0.2s" }}>
          ✏️ Edit
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(emp); }}
          style={{ flex:1, padding:"9px 0", borderRadius:10,
            background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
            color:"#f87171", fontSize:12, fontWeight:700, cursor:"pointer",
            transition:"all 0.2s" }}>
          🗑 Remove
        </button>
      </div>
    </TiltCard>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color, spark }) {
  return (
    <TiltCard style={{
      background: "rgba(15,23,42,0.8)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20,
      padding: "22px 22px 18px",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ width:44, height:44, borderRadius:14,
          background: color + "22", border:`1px solid ${color}44`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
          {icon}
        </div>
        {spark && <Sparkline data={spark} color={color} />}
      </div>
      <div style={{ fontSize:26, fontWeight:800, color:"#f1f5f9", letterSpacing:-0.5 }}>{value}</div>
      <div style={{ fontSize:12, color:"#64748b", fontWeight:600, marginTop:2 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:color, marginTop:4, fontWeight:600 }}>{sub}</div>}
    </TiltCard>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortBy, setSortBy]         = useState("name");
  const [selected, setSelected]     = useState(new Set());
  const [formOpen, setFormOpen]     = useState(false);
  const [editData, setEditData]     = useState(null);
  const [delTarget, setDelTarget]   = useState(null);
  const [activeTab, setActiveTab]   = useState("team");
  const [toasts, showToast]         = useToast();
  const bgRef = useRef(null);
  const orbPos = useMouseOrb(bgRef);

  // fetch
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API_URL);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEmployees(Array.isArray(d) ? d : []);
    } catch {
      showToast("Could not reach the API. Is the server running?", "error");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // CRUD
  const saveEmployee = async (form, id) => {
    const payload = { name: form.name.trim(), department: form.department, salary: Number(form.salary) };
    try {
      if (id) {
        await fetch(`${API_URL}/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
        showToast(`${payload.name} updated ✓`);
      } else {
        await fetch(API_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
        showToast(`${payload.name} added to the team ✓`);
      }
      setFormOpen(false); setEditData(null);
      fetchEmployees();
    } catch { showToast("Save failed — check your connection.", "error"); }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    try {
      await fetch(`${API_URL}/${delTarget.id}`, { method:"DELETE" });
      showToast(`${delTarget.name} removed.`, "warn");
      setDelTarget(null); fetchEmployees();
    } catch { showToast("Delete failed.", "error"); }
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    await Promise.all([...selected].map(id => fetch(`${API_URL}/${id}`, { method:"DELETE" })));
    showToast(`${selected.size} employees removed.`, "warn");
    setSelected(new Set()); fetchEmployees();
  };

  const exportCSV = () => {
    const rows = [["ID","Name","Department","Salary","Status","Joined"]];
    employees.forEach(e => rows.push([getEmpId(e.id), e.name, e.department, e.salary, getStatus(e.id), getJoinDate(e.id)]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "employees.csv"; a.click();
    showToast("CSV exported ✓");
  };

  // filter + sort
  const filtered = employees
    .filter(e => {
      const q = search.toLowerCase();
      return (deptFilter === "All" || e.department === deptFilter)
        && (e.name?.toLowerCase().includes(q) || e.department?.toLowerCase().includes(q));
    })
    .sort((a,b) => {
      if (sortBy === "salary_desc") return b.salary - a.salary;
      if (sortBy === "salary_asc")  return a.salary - b.salary;
      if (sortBy === "dept")        return a.department?.localeCompare(b.department);
      return a.name?.localeCompare(b.name);
    });

  // stats
  const totalSalary = employees.reduce((s,e) => s + Number(e.salary||0), 0);
  const avgSalary   = employees.length ? Math.round(totalSalary / employees.length) : 0;
  const depts       = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const activeCount = employees.filter((_,i) => getStatus(i+1) === "Active").length;

  // dept distribution
  const deptDist = depts.map(d => ({
    name: d,
    value: employees.filter(e => e.department === d).length,
    color: (DEPT_META[d] || DEPT_META.Engineering).color,
  }));

  // spark data (mock monthly trend)
  const sparkData = [4,6,5,8,7,10,9,12,11,14,13,employees.length];

  const toggleSelect = (id) => {
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const navTabs = [
    { id:"team",      label:"Team",      icon:"👥" },
    { id:"analytics", label:"Analytics", icon:"📊" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body {
          background: #020817;
          font-family: 'Inter', system-ui, sans-serif;
          color: #f1f5f9;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.4); border-radius:4px; }
        input, select, button, textarea { font-family: inherit; }
        input::placeholder { color: #334155; }
        input:focus, select:focus { outline: none; border-color: rgba(139,92,246,0.6) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.15) !important; }

        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes float2 {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(15px) rotate(-120deg); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity:0; }
          to   { transform: translateX(0);    opacity:1; }
        }
        @keyframes modalPop {
          from { transform: scale(0.85); opacity:0; }
          to   { transform: scale(1);    opacity:1; }
        }
        @keyframes fadeSlideUp {
          from { transform: translateY(24px); opacity:0; }
          to   { transform: translateY(0);    opacity:1; }
        }
        @keyframes countUp {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes orb {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(60px,-40px) scale(1.1); }
          66%      { transform: translate(-40px,30px) scale(0.9); }
        }
        .emp-card-enter { animation: fadeSlideUp 0.4s ease forwards; }
        .tab-btn { transition: all 0.2s; }
        .tab-btn:hover { color: #a78bfa !important; }
        .icon-btn:hover { background: rgba(255,255,255,0.1) !important; }
        .action-hover:hover { opacity:0.8; transform:translateY(-1px); }
      `}</style>

      <Toast toasts={toasts} />
      <ConfirmModal
        open={!!delTarget} name={delTarget?.name}
        onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      <EmployeeFormModal
        open={formOpen} editData={editData} onClose={() => { setFormOpen(false); setEditData(null); }}
        onSave={saveEmployee} />

      {/* ── Ambient background ── */}
      <div ref={bgRef} style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
        <div style={{ position:"absolute", width:"100%", height:"100%",
          background:"radial-gradient(ellipse 80% 60% at 50% -10%, rgba(120,60,255,0.15) 0%, transparent 60%)" }} />
        {/* Floating orbs */}
        <div style={{ position:"absolute", top:"10%", left:"5%", width:400, height:400,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          animation:"orb 12s ease-in-out infinite", filter:"blur(1px)" }} />
        <div style={{ position:"absolute", top:"50%", right:"5%", width:300, height:300,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)",
          animation:"orb 16s ease-in-out infinite reverse", filter:"blur(1px)" }} />
        <div style={{ position:"absolute", bottom:"10%", left:"30%", width:250, height:250,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%)",
          animation:"orb 20s ease-in-out infinite 4s", filter:"blur(1px)" }} />
        {/* Mouse-following glow */}
        <div style={{ position:"absolute", borderRadius:"50%", width:600, height:600,
          background:"radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
          transform:`translate(${orbPos.x - 300}px, ${orbPos.y - 300}px)`,
          transition:"transform 0.3s ease", pointerEvents:"none" }} />
        {/* Grid */}
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize:"60px 60px",
        }} />
      </div>

      {/* ── Layout ── */}
      <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* ── Navbar ── */}
        <nav style={{
          position:"sticky", top:0, zIndex:100,
          background:"rgba(2,8,23,0.8)", backdropFilter:"blur(20px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          padding:"0 32px", height:64,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:10,
              background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 0 20px rgba(139,92,246,0.5)", fontSize:16 }}>🚀</div>
            <span style={{ fontSize:16, fontWeight:800, letterSpacing:-0.5 }}>
              PeopleOS
              <span style={{ color:"#7c3aed", fontSize:10, fontWeight:700,
                background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)",
                borderRadius:4, padding:"1px 5px", marginLeft:7, letterSpacing:1 }}>BETA</span>
            </span>
          </div>

          {/* Nav tabs */}
          <div style={{ display:"flex", alignItems:"center", gap:4,
            background:"rgba(255,255,255,0.04)", borderRadius:12, padding:4 }}>
            {navTabs.map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setActiveTab(t.id)} style={{
                padding:"7px 18px", borderRadius:9, border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                background: activeTab===t.id ? "rgba(139,92,246,0.25)" : "transparent",
                color: activeTab===t.id ? "#a78bfa" : "#475569",
                transition:"all 0.2s",
              }}>{t.icon} {t.label}</button>
            ))}
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={exportCSV} className="action-hover" style={{
              padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.05)", color:"#94a3b8", fontSize:12, fontWeight:600, cursor:"pointer",
            }}>⬇ Export CSV</button>
            <button onClick={() => { setEditData(null); setFormOpen(true); }} style={{
              padding:"8px 18px", borderRadius:10,
              background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
              border:"none", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer",
              boxShadow:"0 0 24px rgba(139,92,246,0.4)", transition:"all 0.2s",
            }}>+ Add employee</button>
          </div>
        </nav>

        {/* ── Main Content ── */}
        <main style={{ padding:"32px 32px 60px", maxWidth:1280, margin:"0 auto", width:"100%" }}>

          {/* ── KPI Row ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:28 }}>
            <KPICard label="Total employees"  value={employees.length} icon="👥" color="#7c3aed"
              sub={`+${Math.max(0, employees.length - 10)} this quarter`} spark={sparkData} />
            <KPICard label="Active today"      value={activeCount}      icon="✅" color="#10b981"
              sub={`${Math.round(activeCount/Math.max(employees.length,1)*100)}% attendance`} />
            <KPICard label="Departments"       value={depts.length}     icon="🏢" color="#0ea5e9"
              sub={`Across ${depts.length} teams`} />
            <KPICard label="Avg. salary"       value={fmtCurrency(avgSalary)} icon="💹" color="#f59e0b"
              sub="Monthly per employee" />
            <KPICard label="Total payroll"     value={fmtCurrency(totalSalary)} icon="💰" color="#ec4899"
              sub="Monthly outgoing" />
          </div>

          {/* ── TEAM TAB ── */}
          {activeTab === "team" && (
            <>
              {/* Toolbar */}
              <div style={{ display:"flex", gap:12, flexWrap:"wrap", alignItems:"center", marginBottom:24 }}>
                <div style={{ flex:"1 1 240px", position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                    color:"#334155", fontSize:16 }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or department…"
                    style={{ ...inputStyle, paddingLeft:40, width:"100%", background:"rgba(15,23,42,0.8)" }} />
                </div>

                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                  style={{ ...inputStyle, width:180 }}>
                  <option value="All">All departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={{ ...inputStyle, width:180 }}>
                  <option value="name">Sort: Name A–Z</option>
                  <option value="dept">Sort: Department</option>
                  <option value="salary_desc">Sort: Salary ↓</option>
                  <option value="salary_asc">Sort: Salary ↑</option>
                </select>

                {selected.size > 0 && (
                  <button onClick={bulkDelete} style={{
                    padding:"10px 18px", borderRadius:12,
                    background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.35)",
                    color:"#f87171", fontSize:13, fontWeight:700, cursor:"pointer",
                  }}>🗑 Remove {selected.size} selected</button>
                )}

                <div style={{ marginLeft:"auto", fontSize:12, color:"#475569", fontWeight:500 }}>
                  {filtered.length} of {employees.length} employees
                </div>
              </div>

              {/* Grid */}
              {loading ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
                  {[...Array(6)].map((_,i) => (
                    <div key={i} style={{ background:"rgba(15,23,42,0.8)", borderRadius:20, padding:22, border:"1px solid rgba(255,255,255,0.05)" }}>
                      <Skeleton w={60} h={60} r={30} style={{ margin:"0 auto 12px" }} />
                      <Skeleton w="60%" h={14} style={{ margin:"0 auto 8px" }} />
                      <Skeleton w="40%" h={11} style={{ margin:"0 auto 16px" }} />
                      <Skeleton h={36} />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"80px 24px" }}>
                  <div style={{ fontSize:60, marginBottom:16 }}>🔭</div>
                  <p style={{ color:"#334155", fontSize:16, fontWeight:600 }}>No employees match your search</p>
                  <p style={{ color:"#1e293b", fontSize:13, marginTop:6 }}>
                    {employees.length === 0 ? "Start by adding your first team member." : "Try a different search or filter."}
                  </p>
                  {employees.length === 0 && (
                    <button onClick={() => setFormOpen(true)} style={{
                      marginTop:20, padding:"11px 24px", borderRadius:12,
                      background:"linear-gradient(135deg,#7c3aed,#4f46e5)",
                      border:"none", color:"#fff", fontWeight:700, cursor:"pointer",
                      boxShadow:"0 0 24px rgba(139,92,246,0.35)",
                    }}>+ Add first employee</button>
                  )}
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
                  {filtered.map((emp, i) => (
                    <div key={emp.id} className="emp-card-enter"
                      style={{ animationDelay:`${i * 0.05}s`, animationFillMode:"both" }}>
                      <EmployeeCard emp={emp}
                        selected={selected.has(emp.id)}
                        onSelect={toggleSelect}
                        onEdit={emp => { setEditData(emp); setFormOpen(true); }}
                        onDelete={setDelTarget} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === "analytics" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

              {/* Row 1 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

                {/* Dept distribution */}
                <div style={{ background:"rgba(15,23,42,0.8)", backdropFilter:"blur(20px)",
                  border:"1px solid rgba(255,255,255,0.07)", borderRadius:24, padding:"26px 28px" }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:"#94a3b8", marginBottom:20,
                    letterSpacing:1, textTransform:"uppercase" }}>Department breakdown</h3>
                  <div style={{ display:"flex", alignItems:"center", gap:24 }}>
                    <PieChart data={deptDist.length ? deptDist : [{ name:"No data", value:1, color:"#334155" }]} />
                    <div style={{ flex:1, minWidth:0 }}>
                      {deptDist.slice(0,6).map(d => (
                        <MiniBar key={d.name} label={d.name} value={d.value}
                          max={Math.max(...deptDist.map(x=>x.value),1)} color={d.color} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status breakdown */}
                <div style={{ background:"rgba(15,23,42,0.8)", backdropFilter:"blur(20px)",
                  border:"1px solid rgba(255,255,255,0.07)", borderRadius:24, padding:"26px 28px" }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:"#94a3b8", marginBottom:20,
                    letterSpacing:1, textTransform:"uppercase" }}>Workforce status</h3>
                  {["Active","Leave","Resigned"].map(status => {
                    const cnt = employees.filter((_,i) => getStatus(i+1) === status).length;
                    const meta = STATUS_META[status];
                    return (
                      <div key={status} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        background:"rgba(255,255,255,0.03)", borderRadius:12, padding:"12px 16px", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:meta.dot,
                            boxShadow:`0 0 8px ${meta.dot}` }} />
                          <span style={{ fontSize:14, color:"#e2e8f0", fontWeight:600 }}>{status}</span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:100, height:6, background:"rgba(255,255,255,0.06)", borderRadius:4 }}>
                            <div style={{ height:"100%", borderRadius:4, background:meta.dot,
                              width:`${Math.round(cnt/Math.max(employees.length,1)*100)}%`,
                              transition:"width 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                          </div>
                          <span style={{ fontSize:14, fontWeight:700, color:meta.color, minWidth:28, textAlign:"right" }}>{cnt}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Salary histogram */}
              <div style={{ background:"rgba(15,23,42,0.8)", backdropFilter:"blur(20px)",
                border:"1px solid rgba(255,255,255,0.07)", borderRadius:24, padding:"26px 28px" }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:"#94a3b8", marginBottom:20,
                  letterSpacing:1, textTransform:"uppercase" }}>Salary distribution</h3>
                {employees.length === 0 ? (
                  <p style={{ color:"#334155", fontSize:13 }}>No data yet.</p>
                ) : (() => {
                  const buckets = [
                    { label:"< 40K",  min:0,      max:40000  },
                    { label:"40–60K", min:40000,  max:60000  },
                    { label:"60–80K", min:60000,  max:80000  },
                    { label:"80–1L",  min:80000,  max:100000 },
                    { label:"> 1L",   min:100000, max:Infinity },
                  ];
                  const counts = buckets.map(b => employees.filter(e => e.salary >= b.min && e.salary < b.max).length);
                  const maxC = Math.max(...counts, 1);
                  const barColors = ["#7c3aed","#6366f1","#0ea5e9","#10b981","#f59e0b"];
                  return (
                    <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:120 }}>
                      {buckets.map((b,i) => (
                        <div key={b.label} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>{counts[i]}</span>
                          <div style={{ width:"100%", borderRadius:"6px 6px 0 0",
                            height: `${Math.round((counts[i]/maxC)*80)}px`,
                            minHeight: counts[i] ? 4 : 0,
                            background: barColors[i],
                            boxShadow: `0 0 12px ${barColors[i]}55`,
                            transition:"height 1s cubic-bezier(0.34,1.56,0.64,1)" }} />
                          <span style={{ fontSize:11, color:"#475569", textAlign:"center" }}>{b.label}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Top earners */}
              <div style={{ background:"rgba(15,23,42,0.8)", backdropFilter:"blur(20px)",
                border:"1px solid rgba(255,255,255,0.07)", borderRadius:24, padding:"26px 28px" }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:"#94a3b8", marginBottom:20,
                  letterSpacing:1, textTransform:"uppercase" }}>Top earners</h3>
                {[...employees].sort((a,b) => b.salary - a.salary).slice(0,5).map((e,i) => {
                  const meta = DEPT_META[e.department] || DEPT_META.Engineering;
                  return (
                    <div key={e.id} style={{ display:"flex", alignItems:"center", gap:14,
                      padding:"12px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span style={{ fontSize:14, fontWeight:700, color:"#334155", minWidth:18 }}>#{i+1}</span>
                      <div style={{ width:36, height:36, borderRadius:"50%",
                        background:`${meta.color}33`, border:`1px solid ${meta.color}44`,
                        display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>
                        {getAvatar(e.name)}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0" }}>{e.name}</div>
                        <div style={{ fontSize:11, color:"#475569" }}>{e.department} · {getRole(e.name)}</div>
                      </div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#a78bfa" }}>{fmtCurrency(e.salary)}</div>
                    </div>
                  );
                })}
                {employees.length === 0 && <p style={{ color:"#334155", fontSize:13 }}>No employees yet.</p>}
              </div>

            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop:"1px solid rgba(255,255,255,0.04)", padding:"16px 32px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"rgba(2,8,23,0.6)", backdropFilter:"blur(10px)" }}>
          <span style={{ fontSize:12, color:"#1e293b" }}>PeopleOS · {new Date().getFullYear()}</span>
          <span style={{ fontSize:12, color:"#1e293b" }}>{employees.length} employees · {depts.length} departments</span>
        </footer>
      </div>
    </>
  );
}
