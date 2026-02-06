"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import styles from "../sign-in/sign-in.module.css";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await apiClient.signup({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        embedding: [], // placeholder, generated later
      });

      if (response?.error) {
        setError(response.error);
        return;
      }

      // ✅ Signup succeeded
      setSuccess(true);

      // Small delay so the user sees success feedback
      setTimeout(() => {
        router.push("/sign-in");
      }, 1200);
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
            Account created successfully! Redirecting to sign in…
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
          </label>

          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </label>

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
