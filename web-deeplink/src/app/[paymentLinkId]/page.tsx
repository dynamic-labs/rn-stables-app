import { redirect } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Page({ params }: any) {
  const { paymentLinkId } = params;
  const deepLink = `ReactNativeStablecoinApp://send/${paymentLinkId}`;

  if (typeof window === "undefined") {
    // Server-side: perform redirect for crawlers and direct navigation
    redirect(deepLink);
  }

  // Client-side: show fallback UI
  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`1;url=${deepLink}`} />
        <title>Redirecting...</title>
      </head>
      <body
        style={{ fontFamily: "sans-serif", textAlign: "center", padding: 40 }}
      >
        <h2>Redirecting you to the app...</h2>
        <p>
          If you are not redirected, <a href={deepLink}>click here</a>.
        </p>
      </body>
    </html>
  );
}
