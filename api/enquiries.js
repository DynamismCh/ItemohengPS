import { get, put } from "@vercel/blob";
import { randomUUID, timingSafeEqual } from "node:crypto";

const KEY = "itemoheng/enquiries.json";
const token = process.env.BLOB_READ_WRITE_TOKEN;
const editorToken = process.env.ITEMOHENG_EDITOR_TOKEN;

function authorised(req) {
  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!editorToken || !supplied) return false;
  const a = Buffer.from(supplied), b = Buffer.from(editorToken);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readInbox() {
  if (!token) throw new Error("Private storage is not configured.");
  const result = await get(KEY, { access: "private", token, useCache: false });
  if (result?.statusCode === 200 && result.stream) return await new Response(result.stream).json();
  return [];
}
async function saveInbox(items) {
  await put(KEY, JSON.stringify(items), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", token });
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!authorised(req)) return res.status(401).json({ error: "Unauthorised. Open the private editor link." });
  try {
    const items = await readInbox();
    if (req.method === "GET") return res.status(200).json({ enquiries: items });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (req.method === "DELETE") {
      if (!body.id) return res.status(400).json({ error: "An enquiry ID is required." });
      const next = items.filter(x => x.id !== body.id);
      if (next.length === items.length) return res.status(404).json({ error: "Enquiry not found." });
      await saveInbox(next);
      return res.status(200).json({ success: true });
    }
    if (req.method === "PATCH") {
      const item = items.find(x => x.id === body.id);
      if (!item) return res.status(404).json({ error: "Enquiry not found." });
      if (!["New", "Reviewed"].includes(body.status)) return res.status(400).json({ error: "Invalid status." });
      item.status = body.status;
      await saveInbox(items);
      return res.status(200).json({ success: true });
    }
    res.setHeader("Allow", "GET, DELETE, PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  } catch (error) {
    console.error("[itemoheng] private inbox failed:", error);
    return res.status(500).json({ error: "The private inbox could not be updated. Please try again." });
  }
}