"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import styles from "../sign-in/sign-in.module.css";
import Link from "next/link";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters",       test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",         test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",         test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",                   test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character",        test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordResults = PASSWORD_RULES.map((r) => r.test(password));
  const passwordValid = passwordResults.every(Boolean);
  const emailValid = EMAIL_RE.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!passwordValid) {
      setError("Password does not meet all requirements.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiClient.signup({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        embedding: [],
      });

      if (response?.error) {
        setError(response.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/sign-in"), 1200);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Link href="/" className={styles.logoLink}>
        <img src="/logo.png" className={styles.logo} alt="Logo" />
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Sign Up</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && (
          <p style={{ color: "#2e7d32", marginBottom: 12 }}>
            Account created! Redirecting…
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            First Name
            <input
              className={styles.input}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

          <label className={styles.label}>
            Last Name
            <input
              className={styles.input}
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
            {email && !emailValid && (
              <span style={{ fontSize: 12, color: "#c0392b", marginTop: 4, display: "block" }}>
                Enter a valid email address
              </span>
            )}
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              required
              disabled={isSubmitting}
            />
          </label>

          {/* Password requirements — shown once user starts typing */}
          {(passwordFocused || password.length > 0) && (
            <ul style={{ listStyle: "none", padding: 0, margin: "-4px 0 8px", fontSize: 12 }}>
              {PASSWORD_RULES.map((rule, i) => (
                <li
                  key={rule.label}
                  style={{
                    color: passwordResults[i] ? "#2e7d32" : "#888",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span>{passwordResults[i] ? "✓" : "○"}</span>
                  {rule.label}
                </li>
              ))}
            </ul>
          )}

          <button
            className={styles.button}
            type="submit"
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Creating account…" : "Create Account"}
          </button>

          <p className={styles.linkText}>
            Already have an account?{" "}
            <a href="/sign-in" className={styles.link}>
              Sign in here
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
