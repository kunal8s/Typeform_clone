"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import styles from "./form.module.css";

interface QuestionOption {
  id: string;
  label: string;
}

interface PublicQuestion {
  id: number;
  type: string;
  title: string;
  description: string;
  required: boolean;
  options: QuestionOption[];
  position: number;
}

interface PublicForm {
  id: number;
  title: string;
  description: string;
  questions: PublicQuestion[];
}

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function PublicFormPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = welcome screen
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [rating, setRating] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // ===== Persistence for Reloads =====
  useEffect(() => {
    try {
      const savedIndex = sessionStorage.getItem(`tf-index-${slug}`);
      if (savedIndex !== null) setCurrentIndex(parseInt(savedIndex, 10));

      const savedAnswers = sessionStorage.getItem(`tf-answers-${slug}`);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));

      const savedRating = sessionStorage.getItem(`tf-rating-${slug}`);
      if (savedRating) setRating(JSON.parse(savedRating));
    } catch (e) {
      console.error("Failed to restore session state", e);
    }
  }, [slug]);

  useEffect(() => {
    sessionStorage.setItem(`tf-index-${slug}`, currentIndex.toString());
  }, [currentIndex, slug]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem(`tf-answers-${slug}`, JSON.stringify(answers));
    }
  }, [answers, slug]);

  useEffect(() => {
    if (Object.keys(rating).length > 0) {
      sessionStorage.setItem(`tf-rating-${slug}`, JSON.stringify(rating));
    }
  }, [rating, slug]);

  // ===== Fetch Form =====
  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/public/form/${slug}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setForm(await res.json());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  // Auto-focus input when question changes
  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [currentIndex]);

  // ===== Navigation =====
  const totalQuestions = form?.questions.length || 0;
  const isWelcome = currentIndex === -1;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const currentQuestion = form?.questions[currentIndex];
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const validateCurrent = (): boolean => {
    if (!currentQuestion) return true;
    const qId = String(currentQuestion.id);
    const value = answers[qId] || "";

    if (currentQuestion.required && !value.trim()) {
      setError("This question is required");
      return false;
    }

    if (currentQuestion.type === "email" && value) {
      const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRe.test(value)) {
        setError("Please enter a valid email address");
        return false;
      }
    }

    if (currentQuestion.type === "number" && value) {
      if (isNaN(Number(value))) {
        setError("Please enter a valid number");
        return false;
      }
    }

    setError("");
    return true;
  };

  const goNext = () => {
    if (!validateCurrent()) return;
    setDirection("next");
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
      setError("");
    }
  };

  const goPrev = () => {
    if (currentIndex > -1) {
      setDirection("prev");
      setCurrentIndex((i) => i - 1);
      setError("");
    }
  };

  const startForm = () => {
    if (totalQuestions === 0) return;
    setDirection("next");
    setCurrentIndex(0);
  };

  // ===== Keyboard Navigation =====
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitted || submitting) return;

      if (e.key === "Enter" && !e.shiftKey) {
        // Don't prevent default for textarea
        if (currentQuestion?.type === "long_text") return;
        e.preventDefault();
        if (isWelcome) startForm();
        else goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  // ===== Answer Handlers =====
  const setAnswer = (qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    setError("");
  };

  const setRatingValue = (qId: string, value: number) => {
    setRating((prev) => ({ ...prev, [qId]: value }));
    setAnswer(qId, String(value));
  };

  // ===== Submit =====
  const handleSubmit = async () => {
    if (!form || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/public/form/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.detail || "Submission failed");
        setSubmitting(false);
      }
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  // ===== Loading =====
  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // ===== Not Found =====
  if (notFound || !form) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>🔍</div>
          <h1 className={styles.errorTitle}>Form not found</h1>
          <p className={styles.errorDesc}>This form may not exist, has been unpublished, or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  // ===== Thank You Screen =====
  if (submitted) {
    return (
      <div className={styles.thankYouPage}>
        <div className={styles.thankYouContent}>
          <div className={styles.thankYouIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className={styles.thankYouTitle}>Thank you!</h1>
          <p className={styles.thankYouDesc}>Your response has been recorded.</p>
          <button className={styles.thankYouBtn} onClick={() => {
            sessionStorage.removeItem(`tf-index-${slug}`);
            sessionStorage.removeItem(`tf-answers-${slug}`);
            sessionStorage.removeItem(`tf-rating-${slug}`);
            window.location.reload();
          }}>
            Submit another response
          </button>
        </div>
      </div>
    );
  }

  // ===== Welcome Screen =====
  if (isWelcome) {
    return (
      <div className={styles.questionPage}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: "0%" }} />
        </div>
        <div className={`${styles.questionContainer} ${styles.slideIn}`}>
          <div className={styles.welcomeContent}>
            <h1 className={styles.welcomeTitle}>{form.title}</h1>
            {form.description && <p className={styles.welcomeDesc}>{form.description}</p>}
            <button className={styles.startButton} onClick={startForm} id="start-form">
              Start
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <p className={styles.pressEnter}>
              press <strong>Enter ↵</strong>
            </p>
          </div>
        </div>
        <div className={styles.footer}>
          <span className={styles.footerBrand}>
            <svg width="20" height="14" viewBox="0 0 33 22" fill="none">
              <path d="M0 0H10.5C14.5 0 17 2.5 17 5.5C17 8.5 14.5 11 10.5 11H6V22H0V0Z" fill="currentColor" />
              <path d="M19 5.5C19 2.5 21.5 0 25.5 0H33V6H25.5C24.5 6 24 6.5 24 7V22H19V5.5Z" fill="currentColor" />
            </svg>
            typeform
          </span>
        </div>
      </div>
    );
  }

  // ===== Question Screen =====
  const q = currentQuestion;
  if (!q) {
    // If somehow currentIndex is out of bounds, reset it
    setTimeout(() => setCurrentIndex(-1), 0);
    return null;
  }
  const qId = String(q.id);

  return (
    <div className={styles.questionPage}>
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Question Content */}
      <div
        className={`${styles.questionContainer} ${direction === "next" ? styles.slideInNext : styles.slideInPrev}`}
        key={currentIndex}
      >
        <div className={styles.questionContent}>
          <div className={styles.questionLabel}>
            <span className={styles.questionNum}>{currentIndex + 1}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <h2 className={styles.questionTitle}>
            {q.title}
            {q.required && <span className={styles.requiredStar}>*</span>}
          </h2>
          {q.description && <p className={styles.questionDesc}>{q.description}</p>}

          {/* Input Renderers */}
          <div className={styles.inputArea}>
            {q.type === "short_text" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className={styles.textInput}
                placeholder="Type your answer here..."
                value={answers[qId] || ""}
                onChange={(e) => setAnswer(qId, e.target.value)}
                id={`answer-${qId}`}
              />
            )}

            {q.type === "long_text" && (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                className={styles.textareaInput}
                placeholder="Type your answer here..."
                value={answers[qId] || ""}
                onChange={(e) => setAnswer(qId, e.target.value)}
                rows={4}
                id={`answer-${qId}`}
              />
            )}

            {q.type === "email" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className={styles.textInput}
                type="email"
                placeholder="name@example.com"
                value={answers[qId] || ""}
                onChange={(e) => setAnswer(qId, e.target.value)}
                id={`answer-${qId}`}
              />
            )}

            {q.type === "number" && (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className={styles.textInput}
                type="number"
                placeholder="Type a number..."
                value={answers[qId] || ""}
                onChange={(e) => setAnswer(qId, e.target.value)}
                id={`answer-${qId}`}
              />
            )}

            {q.type === "multiple_choice" && (
              <div className={styles.choiceList}>
                {q.options.map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isSelected = answers[qId] === opt.label;
                  return (
                    <button
                      key={opt.id}
                      className={isSelected ? styles.choiceItemSelected : styles.choiceItem}
                      onClick={() => {
                        setAnswer(qId, opt.label);
                        // Auto-advance after 400ms
                        setTimeout(() => {
                          if (validateCurrent()) {
                            setDirection("next");
                            if (!isLastQuestion) {
                              setCurrentIndex((i) => i + 1);
                            } else {
                              handleSubmit();
                            }
                          }
                        }, 400);
                      }}
                      id={`choice-${opt.id}`}
                    >
                      <span className={styles.choiceKey}>{letter}</span>
                      <span className={styles.choiceLabel}>{opt.label}</span>
                      {isSelected && (
                        <svg className={styles.choiceCheck} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "dropdown" && (
              <select
                className={styles.selectInput}
                value={answers[qId] || ""}
                onChange={(e) => setAnswer(qId, e.target.value)}
                id={`answer-${qId}`}
              >
                <option value="">Select an option...</option>
                {q.options.map((opt) => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
            )}

            {q.type === "yes_no" && (
              <div className={styles.yesNoGroup}>
                {[
                  { label: "Yes", key: "Y" },
                  { label: "No", key: "N" },
                ].map(({ label, key }) => {
                  const isSelected = answers[qId] === label;
                  return (
                    <button
                      key={label}
                      className={isSelected ? styles.yesNoSelected : styles.yesNoBtn}
                      onClick={() => {
                        setAnswer(qId, label);
                        setTimeout(() => {
                          if (validateCurrent()) {
                            setDirection("next");
                            if (!isLastQuestion) {
                              setCurrentIndex((i) => i + 1);
                            } else {
                              handleSubmit();
                            }
                          }
                        }, 400);
                      }}
                      id={`yn-${label.toLowerCase()}`}
                    >
                      <span className={styles.ynKey}>{key}</span>
                      {label}
                      {isSelected && (
                        <svg className={styles.choiceCheck} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "rating" && (
              <div className={styles.ratingGroup}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={
                      (rating[qId] || 0) >= n
                        ? styles.ratingStarActive
                        : styles.ratingStar
                    }
                    onClick={() => setRatingValue(qId, n)}
                    id={`rating-${n}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorMsg}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* OK Button */}
          {q.type !== "multiple_choice" && q.type !== "yes_no" && (
            <div className={styles.okRow}>
              <button className={styles.okButton} onClick={goNext} id="next-question">
                {isLastQuestion ? "Submit" : "OK"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <span className={styles.pressEnterSmall}>
                press <strong>Enter ↵</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className={styles.footer}>
        <span className={styles.footerBrand}>
          <svg width="20" height="14" viewBox="0 0 33 22" fill="none">
            <path d="M0 0H10.5C14.5 0 17 2.5 17 5.5C17 8.5 14.5 11 10.5 11H6V22H0V0Z" fill="currentColor" />
            <path d="M19 5.5C19 2.5 21.5 0 25.5 0H33V6H25.5C24.5 6 24 6.5 24 7V22H19V5.5Z" fill="currentColor" />
          </svg>
          typeform
        </span>
        <div className={styles.navButtons}>
          <button
            className={styles.navBtn}
            onClick={goPrev}
            disabled={currentIndex <= 0}
            title="Previous"
            id="nav-prev"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button
            className={styles.navBtn}
            onClick={goNext}
            title="Next"
            id="nav-next"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
