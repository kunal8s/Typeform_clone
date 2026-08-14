"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface FormItem {
  id: number;
  title: string;
  question_count: number;
  response_count: number;
  is_published: number;
  updated_at: string;
  share_slug: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<{ msg: string; icon?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FormItem | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem("token");
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  const showToast = (msg: string, icon?: string) => {
    setToast({ msg, icon });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/forms`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setForms(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = getToken();
    const userData = localStorage.getItem("user");
    if (!token || !userData) { router.push("/login"); return; }
    try { setUser(JSON.parse(userData)); } catch { router.push("/login"); return; }
    fetchForms();
  }, [router, fetchForms]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (renamingId !== null && renameRef.current) { renameRef.current.focus(); renameRef.current.select(); }
  }, [renamingId]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/api/forms`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ title: "My typeform" }),
      });
      if (res.ok) { const data = await res.json(); router.push(`/builder/${data.id}`); }
    } catch { showToast("Failed to create form", "✕"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const formId = deleteTarget.id;
    setDeleteTarget(null);
    try {
      const res = await fetch(`${API}/api/forms/${formId}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) { setForms((prev) => prev.filter((f) => f.id !== formId)); showToast("Form deleted", "🗑️"); }
    } catch { showToast("Failed to delete form", "✕"); }
  };

  const startRename = (form: FormItem) => { setMenuOpen(null); setRenamingId(form.id); setRenameValue(form.title); };

  const submitRename = async (formId: number) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    try {
      const res = await fetch(`${API}/api/forms/${formId}/rename`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (res.ok) {
        setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, title: renameValue.trim() } : f)));
        showToast("Form renamed", "✏️");
      }
    } catch { showToast("Failed to rename", "✕"); }
    setRenamingId(null);
  };

  const handleDuplicate = async (formId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch(`${API}/api/forms/${formId}/duplicate`, { method: "POST", headers: authHeaders() });
      if (res.ok) { await fetchForms(); showToast("Form duplicated", "📋"); }
    } catch { showToast("Failed to duplicate", "✕"); }
  };

  const handleTogglePublish = async (formId: number) => {
    setMenuOpen(null);
    try {
      const res = await fetch(`${API}/api/forms/${formId}/publish`, { method: "PUT", headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setForms((prev) => prev.map((f) => f.id === formId ? { ...f, is_published: data.is_published ? 1 : 0 } : f));
        showToast(data.is_published ? "Form published!" : "Form unpublished", data.is_published ? "🚀" : "📝");
      }
    } catch { showToast("Failed to update", "✕"); }
  };

  const handleCopyLink = async (form: FormItem) => {
    setMenuOpen(null);
    const link = `${window.location.origin}/form/${form.share_slug}`;
    try { await navigator.clipboard.writeText(link); showToast("Link copied!", "🔗"); } catch { showToast(link); }
  };

  const handleMenuOpen = (e: React.MouseEvent, formId: number) => {
    e.stopPropagation();
    if (menuOpen === formId) { setMenuOpen(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 200 });
    setMenuOpen(formId);
  };

  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); router.push("/login"); };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getFormColor = (id: number) => {
    const colors = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63'];
    return colors[id % colors.length];
  };

  const filteredForms = searchQuery.trim()
    ? forms.filter((f) => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : forms;

  const totalResponses = forms.reduce((acc, f) => acc + (f.response_count || 0), 0);

  if (!user) return null;

  return (
    <div className={styles.page}>
      {/* ===== Top Header ===== */}
      <header className={styles.topHeader}>
        <div className={styles.topHeaderLeft}>
          <div className={styles.userBadge} id="user-badge">
            <span className={styles.userAvatar}>{user.email.charAt(0).toUpperCase()}</span>
            <span className={styles.userName}>{user.email.split('@')[0]}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <nav className={styles.topNav}>
          <button className={styles.topNavActive} id="nav-forms">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Forms
          </button>
        </nav>
        <div className={styles.topHeaderRight}>
          <button className={styles.logoutBtn} onClick={handleLogout} id="logout-button">Log out</button>
          <span className={styles.headerAvatar}>{user.email.charAt(0).toUpperCase()}{user.email.charAt(1)?.toUpperCase()}</span>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ===== Left Sidebar ===== */}
        <aside className={styles.sidebar}>
          <button className={styles.createBtn} onClick={handleCreate} id="create-form-button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create form
          </button>

          <div className={styles.sidebarSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} id="search-forms" />
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarSectionHeader}>
              <span>Workspaces</span>
              <button className={styles.sidebarPlusBtn} title="Add workspace">+</button>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.sidebarSectionHeader}><span>Private</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg></div>
            <button className={styles.workspaceItem + " " + styles.workspaceActive}>
              <span>My workspace</span>
              <span className={styles.workspaceCount}>{forms.length}</span>
            </button>
          </div>

          <div className={styles.sidebarBottom}>
            <div className={styles.responseCounter}>
              <span className={styles.responseCounterLabel}>Responses collected</span>
              <span className={styles.responseCounterValue}>{totalResponses}</span>
            </div>
          </div>
        </aside>

        {/* ===== Main Content ===== */}
        <main className={styles.main}>
          <div className={styles.workspaceHeader}>
            <h1 className={styles.workspaceTitle}>My workspace</h1>
            <div className={styles.workspaceActions}>
              <div className={styles.sortBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Date created
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}><div className={styles.spinner} /></div>
          ) : forms.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></div>
              <h2 className={styles.emptyTitle}>Create your first typeform</h2>
              <p className={styles.emptyDesc}>Build forms, surveys, and quizzes that people enjoy answering.</p>
              <button className={styles.emptyCreateBtn} onClick={handleCreate}>+ Create a typeform</button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className={styles.tableHeader}>
                <div className={styles.colName}>Name</div>
                <div className={styles.colResponses}>Responses</div>
                <div className={styles.colStatus}>Status</div>
                <div className={styles.colUpdated}>Updated</div>
                <div className={styles.colActions}></div>
              </div>

              {/* Form Rows */}
              <div className={styles.tableBody}>
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className={styles.formRow}
                    onClick={() => { if (renamingId !== form.id) router.push(`/builder/${form.id}`); }}
                    id={`form-card-${form.id}`}
                  >
                    <div className={styles.colName}>
                      <div className={styles.formAvatar} style={{ background: getFormColor(form.id) }}>
                        {form.title.charAt(0).toUpperCase()}
                      </div>
                      {renamingId === form.id ? (
                        <input
                          ref={renameRef}
                          className={styles.renameInput}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(form.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename(form.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className={styles.formName}>{form.title}</span>
                      )}
                    </div>
                    <div className={styles.colResponses}>
                      <span className={styles.cellValue}>{form.response_count || "—"}</span>
                    </div>
                    <div className={styles.colStatus}>
                      {form.is_published ? (
                        <span className={styles.publishedBadge}><span className={styles.publishedDot}/>Published</span>
                      ) : (
                        <span className={styles.draftBadge}>Draft</span>
                      )}
                    </div>
                    <div className={styles.colUpdated}>
                      <span className={styles.cellValue}>{formatDate(form.updated_at)}</span>
                    </div>
                    <div className={styles.colActions}>
                      <button
                        className={styles.rowMenuBtn}
                        onClick={(e) => handleMenuOpen(e, form.id)}
                        id={`menu-trigger-${form.id}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* ===== Context Menu ===== */}
      {menuOpen !== null && (() => {
        const form = forms.find((f) => f.id === menuOpen);
        if (!form) return null;
        return (
          <div className={styles.contextMenu} ref={menuRef} style={{ top: menuPos.top, left: menuPos.left }} onClick={(e) => e.stopPropagation()}>
            <button className={styles.menuItem} onClick={() => { setMenuOpen(null); router.push(`/builder/${form.id}`); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button className={styles.menuItem} onClick={() => startRename(form)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
              Rename
            </button>
            <button className={styles.menuItem} onClick={() => handleDuplicate(form.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              Duplicate
            </button>
            <button className={styles.menuItem} onClick={() => handleTogglePublish(form.id)}>
              {form.is_published ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg>Unpublish</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Publish</>
              )}
            </button>
            {form.is_published && (
              <button className={styles.menuItem} onClick={() => handleCopyLink(form)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Copy link
              </button>
            )}
            <button className={styles.menuItem} onClick={() => { setMenuOpen(null); router.push(`/results/${form.id}`); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              View responses {form.response_count > 0 && <span style={{marginLeft:'auto',fontSize:'11px',color:'var(--tf-gray-500)'}}>{form.response_count}</span>}
            </button>
            <div className={styles.menuDivider}/>
            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { setMenuOpen(null); setDeleteTarget(form); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        );
      })()}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete form?</h2>
            <p className={styles.modalDesc}>
              Are you sure you want to delete &ldquo;{deleteTarget.title}&rdquo;?
              {deleteTarget.response_count > 0 && <> This form has {deleteTarget.response_count} response{deleteTarget.response_count !== 1 ? "s" : ""} that will also be permanently deleted.</>}
              {" "}This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className={styles.modalConfirm} onClick={handleDelete} id="confirm-delete">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={styles.toast}>
          {toast.icon && <span className={styles.toastIcon}>{toast.icon}</span>}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
