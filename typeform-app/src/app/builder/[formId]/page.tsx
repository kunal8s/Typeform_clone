"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./builder.module.css";
import {
  FormData, Question, QuestionType,
  QUESTION_TYPE_CATEGORIES, getDefaultTitle, getTypeIcon, getTypeLabel,
} from "@/types/form";

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.formId as string;

  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addPanelSearch, setAddPanelSearch] = useState("");

  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const getToken = () => localStorage.getItem("token");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ===== Load Form =====
  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) { router.push("/dashboard"); return; }
      const data = await res.json();
      data.questions = (data.questions || []).map((q: Question, i: number) => ({
        ...q, position: i, options: q.options || [],
      }));
      setForm(data);
      if (data.questions.length > 0) setSelectedId(data.questions[0].id);
    } catch { router.push("/dashboard"); }
    setLoading(false);
  }, [formId, router]);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    fetchForm();
  }, [fetchForm, router]);

  // ===== Helpers =====
  const updateFormMeta = (key: string, val: string) => {
    if (!form) return;
    setForm({ ...form, [key]: val });
    setHasChanges(true);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    if (!form) return;
    setForm({
      ...form,
      questions: form.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    });
    setHasChanges(true);
  };

  const addQuestion = (type: QuestionType) => {
    if (!form) return;
    const newQ: Question = {
      id: `new_${Date.now()}`,
      type, title: getDefaultTitle(type),
      description: "", required: false,
      options: (type === "multiple_choice" || type === "dropdown")
        ? [{ id: `opt_1`, label: "Option 1" }, { id: `opt_2`, label: "Option 2" }]
        : [],
      position: form.questions.length,
    };
    setForm({ ...form, questions: [...form.questions, newQ] });
    setSelectedId(newQ.id);
    setHasChanges(true);
    setShowAddPanel(false);
  };

  const deleteQuestion = (id: string) => {
    if (!form) return;
    const newQs = form.questions.filter((q) => q.id !== id);
    setForm({ ...form, questions: newQs });
    if (selectedId === id) setSelectedId(newQs.length > 0 ? newQs[0].id : null);
    setHasChanges(true);
  };

  const duplicateQuestion = (id: string) => {
    if (!form) return;
    const q = form.questions.find((q) => q.id === id);
    if (!q) return;
    const dup: Question = {
      ...q, id: `new_${Date.now()}`,
      options: q.options.map((o, i) => ({ ...o, id: `opt_dup_${i}_${Date.now()}` })),
      position: form.questions.length,
    };
    setForm({ ...form, questions: [...form.questions, dup] });
    setSelectedId(dup.id);
    setHasChanges(true);
  };

  const addOption = (qId: string) => {
    if (!form) return;
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === qId ? { ...q, options: [...q.options, { id: `opt_${Date.now()}`, label: `Option ${q.options.length + 1}` }] } : q
      ),
    });
    setHasChanges(true);
  };

  const updateOption = (qId: string, optId: string, label: string) => {
    if (!form) return;
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === qId ? { ...q, options: q.options.map((o) => (o.id === optId ? { ...o, label } : o)) } : q
      ),
    });
    setHasChanges(true);
  };

  const removeOption = (qId: string, optId: string) => {
    if (!form) return;
    setForm({
      ...form,
      questions: form.questions.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== optId) } : q
      ),
    });
    setHasChanges(true);
  };

  // ===== Drag & Drop =====
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!form || dragIndexRef.current === null) return;
    const from = dragIndexRef.current;
    if (from === targetIndex) { setDragOverIndex(null); setDraggingIndex(null); return; }
    const qs = [...form.questions];
    const [item] = qs.splice(from, 1);
    qs.splice(targetIndex > from ? targetIndex - 1 : targetIndex, 0, item);
    setForm({ ...form, questions: qs.map((q, i) => ({ ...q, position: i })) });
    setHasChanges(true);
    setDragOverIndex(null);
    setDraggingIndex(null);
    dragIndexRef.current = null;
  };
  const handleDragEnd = () => { setDragOverIndex(null); setDraggingIndex(null); dragIndexRef.current = null; };

  // ===== Save =====
  const saveForm = useCallback(async () => {
    if (!form || isSaving) return;
    setIsSaving(true);
    try {
      const body = {
        title: form.title, description: form.description,
        questions: form.questions.map((q, i) => ({
          id: String(q.id).startsWith("new_") ? undefined : q.id,
          type: q.type, title: q.title, description: q.description,
          required: q.required, options: q.options, position: i,
        })),
      };
      const res = await fetch(`${API}/api/forms/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        data.questions = (data.questions || []).map((q: Question, i: number) => ({ ...q, position: i, options: q.options || [] }));
        setForm(data);
        setHasChanges(false);
        showToast("Saved ✓");
      }
    } catch { showToast("Save failed"); }
    setIsSaving(false);
  }, [form, formId, isSaving]);

  // ===== Publish =====
  const togglePublish = async () => {
    await saveForm();
    
    // If it's already published, just act as a "Publish Changes" and redirect
    if (form?.is_published) {
      showToast("Changes published! 🚀 Redirecting...");
      setTimeout(() => router.push("/dashboard"), 1500);
      return;
    }

    try {
      const res = await fetch(`${API}/api/forms/${formId}/publish`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => prev ? { ...prev, is_published: data.is_published, share_slug: data.share_slug } : prev);
        showToast(data.is_published ? "Published! 🚀 Redirecting..." : "Unpublished");
        if (data.is_published) {
          setTimeout(() => router.push("/dashboard"), 1500);
        }
      }
    } catch { showToast("Publish failed"); }
  };

  // Auto-save on Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveForm(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveForm]);

  if (loading || !form) {
    return <div className={styles.loadingPage}><div className={styles.spinner} /></div>;
  }

  const selectedQ = form.questions.find((q) => q.id === selectedId);

  // Category data for the "Add content" modal — only our supported types with colored icons
  const addPanelCategories = [
    { name: "Contact info", types: [
      { type: "email" as QuestionType, label: "Email", icon: "✉️", color: "#4b83f0" },
    ]},
    { name: "Choice", types: [
      { type: "multiple_choice" as QuestionType, label: "Multiple Choice", icon: "☑", color: "#8b5cf6" },
      { type: "dropdown" as QuestionType, label: "Dropdown", icon: "▾", color: "#6366f1" },
      { type: "yes_no" as QuestionType, label: "Yes/No", icon: "Y/N", color: "#ec4899" },
    ]},
    { name: "Rating & ranking", types: [
      { type: "rating" as QuestionType, label: "Rating", icon: "★", color: "#f59e0b" },
    ]},
    { name: "Text & Video", types: [
      { type: "long_text" as QuestionType, label: "Long Text", icon: "¶", color: "#10b981" },
      { type: "short_text" as QuestionType, label: "Short Text", icon: "Aa", color: "#14b8a6" },
    ]},
    { name: "Other", types: [
      { type: "number" as QuestionType, label: "Number", icon: "#", color: "#f97316" },
    ]},
  ];

  // Filter for search
  const filteredCategories = addPanelSearch.trim()
    ? addPanelCategories.map((cat) => ({
        ...cat,
        types: cat.types.filter((t) => t.label.toLowerCase().includes(addPanelSearch.toLowerCase())),
      })).filter((cat) => cat.types.length > 0)
    : addPanelCategories;

  return (
    <div className={styles.page}>
      {/* ===== Top Header ===== */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.breadcrumbLink} onClick={() => router.push("/dashboard")} id="back-to-dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            Forms
          </button>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.breadcrumbSep}><polyline points="9 18 15 12 9 6"/></svg>
          <input
            className={styles.titleInput}
            value={form.title}
            onChange={(e) => updateFormMeta("title", e.target.value)}
            placeholder="Form title"
            id="header-title-input"
          />
        </div>
        <div className={styles.headerCenter}>
          <button className={styles.headerTabActive}>Content</button>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.saveIndicator}>
            <span className={hasChanges ? styles.unsavedDot : styles.savedDot} />
            {isSaving ? "Saving..." : hasChanges ? "Unsaved" : "Saved"}
          </div>
          {form.is_published && (
            <button className={styles.shareBtn} onClick={() => {
              const link = `${window.location.origin}/form/${form.share_slug}`;
              navigator.clipboard.writeText(link).then(() => showToast("Link copied! ✓")).catch(() => showToast(link));
            }} id="share-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Share
            </button>
          )}
          <button className={styles.resultsBtn} onClick={() => router.push(`/results/${formId}`)} id="results-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Results
          </button>
          <button className={form.is_published ? styles.publishedBtn : styles.publishBtn} onClick={togglePublish} id="publish-btn">
            {form.is_published ? "Published ✓" : "Publish"}
          </button>
        </div>
      </header>

      {/* ===== Toolbar ===== */}
      <div className={styles.toolbar}>
        <button className={styles.addContentBtn} onClick={() => { setShowAddPanel(true); setAddPanelSearch(""); }} id="add-content-button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add content
        </button>
        <button className={styles.toolbarIconBtn} onClick={saveForm} title="Save" id="save-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        </button>
      </div>

      {/* ===== Body: 3-Panel Layout ===== */}
      <div className={styles.body}>
        {/* Left: Pages Sidebar */}
        <aside className={styles.pagesSidebar}>
          <div className={styles.pagesTitle}>Pages</div>
          <div className={styles.pagesList}>
            {form.questions.map((q, index) => (
              <div key={q.id}>
                {dragOverIndex === index && dragIndexRef.current !== index && <div className={styles.dropIndicator}/>}
                <button
                  className={selectedId === q.id ? styles.pageItemActive : styles.pageItem}
                  onClick={() => setSelectedId(q.id)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{ opacity: draggingIndex === index ? 0.4 : 1 }}
                  id={`page-item-${index}`}
                >
                  <span className={styles.pageIcon}>{getTypeIcon(q.type)}</span>
                  <span className={styles.pageNum}>{index + 1}</span>
                </button>
              </div>
            ))}
            {form.questions.length > 0 && (
              <div style={{height:20}} onDragOver={(e)=>handleDragOver(e,form.questions.length)} onDrop={(e)=>handleDrop(e,form.questions.length)}>
                {dragOverIndex === form.questions.length && <div className={styles.dropIndicator}/>}
              </div>
            )}
          </div>
          <button className={styles.addContentSidebarBtn} onClick={() => { setShowAddPanel(true); setAddPanelSearch(""); }}>
            + Add content
          </button>
          <div className={styles.endingsSection}>
            <div className={styles.endingsTitle}>Endings</div>
            <div className={styles.endingItem}>
              <span className={styles.endingIcon}>🎉</span>
              <span className={styles.endingLabel}>Thank you</span>
            </div>
          </div>
        </aside>

        {/* Center: Question Editor */}
        <main className={styles.canvas}>
          {!selectedQ ? (
            <div className={styles.emptyCanvas}>
              <div className={styles.emptyIcon}>📝</div>
              <h3 className={styles.emptyTitle}>No questions yet</h3>
              <p className={styles.emptyDesc}>Click &ldquo;+ Add content&rdquo; to add your first question</p>
            </div>
          ) : (
            <div className={styles.editorArea}>
              <div className={styles.editorQuestionNum}>{form.questions.findIndex((q) => q.id === selectedId) + 1}</div>
              <div className={styles.editorBlock}>
                <input
                  className={styles.editorTitleInput}
                  value={selectedQ.title}
                  onChange={(e) => updateQuestion(selectedQ.id, { title: e.target.value })}
                  placeholder="Your question here."
                  id="question-title-input"
                />
                <input
                  className={styles.editorDescInput}
                  value={selectedQ.description}
                  onChange={(e) => updateQuestion(selectedQ.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                  id="question-desc-input"
                />
              </div>

              {/* Options Editor for MC / Dropdown */}
              {(selectedQ.type === "multiple_choice" || selectedQ.type === "dropdown") && (
                <div className={styles.optionsEditor}>
                  {selectedQ.options.map((opt, oi) => (
                    <div key={opt.id} className={styles.optionRow}>
                      <span className={selectedQ.type === "multiple_choice" ? styles.optionMarkerSquare : styles.optionMarkerCircle} />
                      <input
                        className={styles.optionInput}
                        value={opt.label}
                        onChange={(e) => updateOption(selectedQ.id, opt.id, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                      />
                      {selectedQ.options.length > 1 && (
                        <button className={styles.removeOptBtn} onClick={() => removeOption(selectedQ.id, opt.id)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button className={styles.addOptBtn} onClick={() => addOption(selectedQ.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add option
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right: Question Settings */}
        {selectedQ && (
          <aside className={styles.settingsPanel}>
            <div className={styles.settingsSection}>
              <div className={styles.settingsTitle}>Question</div>
            </div>

            <div className={styles.settingsSection}>
              <div className={styles.settingsLabel}>Answer</div>
              <div className={styles.answerTypeSelect}>
                <span className={styles.answerTypeIcon}>{getTypeIcon(selectedQ.type)}</span>
                <span>{getTypeLabel(selectedQ.type)}</span>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <label className={styles.toggleRow}>
                <span className={styles.toggleRowLabel}>Required</span>
                <div
                  className={`${styles.toggle} ${selectedQ.required ? styles.toggleActive : ""}`}
                  onClick={() => updateQuestion(selectedQ.id, { required: !selectedQ.required })}
                >
                  <div className={styles.toggleKnob} />
                </div>
              </label>
            </div>

            <div className={styles.settingsSection}>
              <div className={styles.settingsLabel}>Description</div>
              <textarea
                className={styles.settingsTextarea}
                value={selectedQ.description}
                onChange={(e) => updateQuestion(selectedQ.id, { description: e.target.value })}
                placeholder="Help text for respondent"
                rows={2}
              />
            </div>

            <div className={styles.settingsDivider} />

            <div className={styles.settingsSection}>
              <div className={styles.settingsActions}>
                <button className={styles.settingsActionBtn} onClick={() => duplicateQuestion(selectedQ.id)} title="Duplicate">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Duplicate
                </button>
                <button className={`${styles.settingsActionBtn} ${styles.deleteActionBtn}`} onClick={() => deleteQuestion(selectedQ.id)} title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  Delete
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ===== Add Content Modal (like Image 2) ===== */}
      {showAddPanel && (
        <div className={styles.addOverlay} onClick={() => setShowAddPanel(false)}>
          <div className={styles.addModal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.addModalHeader}>
              <span className={styles.addModalTab}>Add form elements</span>
              <button className={styles.addModalClose} onClick={() => setShowAddPanel(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className={styles.addModalBody}>
              {/* Left sidebar in modal */}
              <div className={styles.addModalSidebar}>
                <div className={styles.addSearchWrapper}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    className={styles.addSearchInput}
                    placeholder="Search form elements"
                    value={addPanelSearch}
                    onChange={(e) => setAddPanelSearch(e.target.value)}
                    autoFocus
                    id="add-panel-search"
                  />
                </div>
                <div className={styles.addSidebarSection}>
                  <div className={styles.addSidebarLabel}>Recommended</div>
                  <div className={styles.addSidebarItem}>
                    <span className={styles.addSidebarIcon}>📋</span>
                    Welcome Screen
                  </div>
                </div>
              </div>

              {/* Main grid */}
              <div className={styles.addModalGrid}>
                {filteredCategories.map((cat) => (
                  <div key={cat.name} className={styles.addCategory}>
                    <div className={styles.addCategoryTitle}>{cat.name}</div>
                    {cat.types.map((t) => (
                      <button
                        key={t.type}
                        className={styles.addTypeBtn}
                        onClick={() => addQuestion(t.type)}
                        id={`add-${t.type}`}
                      >
                        <span className={styles.addTypeIcon} style={{ color: t.color }}>{t.icon}</span>
                        <span className={styles.addTypeLabel}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
