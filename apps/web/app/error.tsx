"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      className="empty"
      style={{ minHeight: "80vh", alignContent: "center" }}
    >
      <h1>A little hiccup.</h1>
      <p>
        Something went wrong while loading this page. Your saved demo guides are
        still on this device.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
