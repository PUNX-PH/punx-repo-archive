"use client";

import { useAuth } from "./AuthProvider";

function partOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// Greets by first name once signed in. Rendered after mount so the server and client never disagree about the hour.
export function Greeting() {
  const { user } = useAuth();
  const first = user?.displayName?.split(" ")[0];
  return (
    <>
      <p className="eyebrow" suppressHydrationWarning>{first ? `${partOfDay()}, ${first}` : "Punx Repo Archive"}</p>
      <h1>Find the repo <em>before</em> you build it.</h1>
    </>
  );
}
