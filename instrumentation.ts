export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "development" &&
    process.env.RR_MEMORY_DB === "1"
  ) {
    const { startMemoryDb } = await import("./dev/memory-db");
    await startMemoryDb();
  }
}
