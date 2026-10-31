export default function HomePage() {
  return (
    <main style={{ padding: "4rem 2rem", fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto", lineHeight: "1.6" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>Fundaments</h1>
      <p style={{ fontSize: "1.2rem", color: "#666", marginBottom: "2rem" }}>
        First-principles engineering education for the AI era.
      </p>

      <section style={{ background: "#f5f5f7", borderRadius: "8px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.3rem", marginTop: 0 }}>MCP Server Active</h2>
        <p>The Model Context Protocol endpoint is live and serving tools over HTTP.</p>
        <code style={{ background: "#e5e5ea", padding: "0.3rem 0.6rem", borderRadius: "4px" }}>
          Endpoint: /api/mcp
        </code>
      </section>

      <section>
        <h3>Available Connectors & Capabilities</h3>
        <ul>
          <li><strong>Knowledge Graph:</strong> Canonical CS concepts (Binary, Two&apos;s Complement, HTTP, SSR, Hydration).</li>
          <li><strong>Project Intelligence:</strong> Connects to Next.js / Prisma vibe-coded projects.</li>
          <li><strong>Persistent Mastery Engine:</strong> Evidence-backed learning saved to Supabase PostgreSQL.</li>
        </ul>
      </section>
    </main>
  );
}