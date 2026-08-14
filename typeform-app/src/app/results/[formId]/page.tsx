"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./results.module.css";

interface QuestionInfo {
  id: number;
  type: string;
  title: string;
  options: { id: string; label: string }[];
}

interface ResponseItem {
  id: number;
  respondent_id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

interface ResponsesData {
  form_id: number;
  form_title: string;
  questions: QuestionInfo[];
  responses: ResponseItem[];
  total: number;
}

const API = "";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.formId as string;

  const [data, setData] = useState<ResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<ResponseItem | null>(null);
  const [tab, setTab] = useState<"table" | "summary">("table");

  const getToken = () => localStorage.getItem("token");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }
      setData(await res.json());
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [formId, router]);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    fetchData();
  }, [fetchData, router]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + "…" : s;

  if (loading || !data) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => router.push("/dashboard")}
            title="Back to dashboard"
            id="back-to-dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <h1 className={styles.headerTitle}>{data.form_title}</h1>
            <p className={styles.headerSub}>{data.total} response{data.total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.editBtn}
            onClick={() => router.push(`/builder/${formId}`)}
            id="edit-form-btn"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Edit form
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={tab === "table" ? styles.tabActive : styles.tab}
          onClick={() => setTab("table")}
          id="tab-table"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
          Responses
        </button>
        <button
          className={tab === "summary" ? styles.tabActive : styles.tab}
          onClick={() => setTab("summary")}
          id="tab-summary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
          Summary
        </button>
      </div>

      {/* Content */}
      <main className={styles.main}>
        {data.responses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </div>
            <h2 className={styles.emptyTitle}>No responses yet</h2>
            <p className={styles.emptyDesc}>Share your form to start collecting responses.</p>
          </div>
        ) : tab === "table" ? (
          /* Table View */
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thIndex}>#</th>
                  {data.questions.map((q) => (
                    <th key={q.id}>{truncate(q.title, 30)}</th>
                  ))}
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.responses.map((resp, ri) => (
                  <tr
                    key={resp.id}
                    className={styles.tr}
                    onClick={() => setSelectedResponse(resp)}
                    id={`response-row-${resp.id}`}
                  >
                    <td className={styles.tdIndex}>{ri + 1}</td>
                    {data.questions.map((q) => (
                      <td key={q.id} className={styles.td}>
                        {truncate(resp.answers[String(q.id)] || "—", 40)}
                      </td>
                    ))}
                    <td className={styles.tdDate}>{formatDate(resp.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Summary View */
          <div className={styles.summaryGrid}>
            {data.questions.map((q) => {
              // Calculate value counts from responses
              const valueCounts: Record<string, number> = {};
              let answeredCount = 0;
              data.responses.forEach((resp) => {
                const val = resp.answers[String(q.id)];
                if (val) {
                  answeredCount++;
                  valueCounts[val] = (valueCounts[val] || 0) + 1;
                }
              });

              return (
                <div key={q.id} className={styles.summaryCard}>
                  <div className={styles.summaryHeader}>
                    <span className={styles.summaryType}>{q.type.replace("_", " ")}</span>
                    <span className={styles.summaryCount}>{answeredCount} / {data.total} answered</span>
                  </div>
                  <h3 className={styles.summaryTitle}>{q.title}</h3>

                  {/* Choice-based: bar chart */}
                  {(q.type === "multiple_choice" || q.type === "dropdown" || q.type === "yes_no") ? (
                    <div className={styles.barChart}>
                      {Object.entries(valueCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, count]) => {
                          const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                          return (
                            <div key={label} className={styles.barRow}>
                              <div className={styles.barLabel}>{label}</div>
                              <div className={styles.barTrack}>
                                <div className={styles.barFill} style={{ width: `${pct}%` }} />
                              </div>
                              <div className={styles.barValue}>{count} ({pct}%)</div>
                            </div>
                          );
                        })}
                    </div>
                  ) : q.type === "rating" ? (
                    /* Rating: star distribution */
                    <div className={styles.barChart}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = valueCounts[String(star)] || 0;
                        const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                        return (
                          <div key={star} className={styles.barRow}>
                            <div className={styles.barLabel}>{"★".repeat(star)}{"☆".repeat(5 - star)}</div>
                            <div className={styles.barTrack}>
                              <div className={styles.barFill} style={{ width: `${pct}%` }} />
                            </div>
                            <div className={styles.barValue}>{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Text/Email/Number: show sample responses */
                    <div className={styles.textResponses}>
                      {Object.entries(valueCounts).slice(0, 5).map(([val]) => (
                        <div key={val} className={styles.textResponse}>{val}</div>
                      ))}
                      {Object.keys(valueCounts).length > 5 && (
                        <div className={styles.moreResponses}>+{Object.keys(valueCounts).length - 5} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className={styles.modalOverlay} onClick={() => setSelectedResponse(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Response Details</h2>
              <button className={styles.modalClose} onClick={() => setSelectedResponse(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className={styles.modalMeta}>
              Submitted {formatDate(selectedResponse.submitted_at)}
            </div>
            <div className={styles.modalBody}>
              {data.questions.map((q, i) => {
                const answer = selectedResponse.answers[String(q.id)] || "";
                return (
                  <div key={q.id} className={styles.modalQA}>
                    <div className={styles.modalQLabel}>
                      <span className={styles.modalQNum}>{i + 1}.</span>
                      {q.title}
                    </div>
                    <div className={answer ? styles.modalAnswer : styles.modalNoAnswer}>
                      {answer || "No answer"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
