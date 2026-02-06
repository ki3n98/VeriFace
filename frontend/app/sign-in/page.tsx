"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import styles from "./sign-in.module.css";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await apiClient.login(email, password);

      if (response.error) {
        setError(response.error);
        return;
      }

      // Token is already saved by apiClient.login()
      // Redirect to events page
      router.push("/picture");
    } catch (error) {
      setError("Login failed. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <Link href="/" className={styles.logoLink}>
        <img src="/logo.png" className={styles.logo} alt="Logo" />
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
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
            />
          </label>

          <button className={styles.button} type="submit">
            Sign In
          </button>
        </form>
        <p className={styles.linkText}>
          Don't have an account?{" "}
          <Link href="/sign-up" className={styles.link}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
