import { list, put } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";

const KEY = "itemoheng/content.json";
const token = process.env.BLOB_READ_WRITE_TOKEN;
const editorToken = process.env.ITEMOHENG_EDITOR_TOKEN;

function authorised(req) {
  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!editorToken || !supplied) return false;
  const a = Buffer.from(supplied), b = Buffer.from(editorToken);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function readContent() {
  if (token) {
    const result = await list({ prefix: KEY, token });
    const blob = result.blobs?.find(item => item.pathname === KEY);
    if (blob) {
      const response = await fetch(blob.downloadUrl || blob.url, { cache: "no-store" });
      if (response.ok) return await response.json();
    }
  }
  const raw = await readFile(new URL("../content.json", import.meta.url), "utf8");
  return JSON.parse(raw);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET") {
    try { return res.status(200).json(await readContent()); }
    catch (error) { return res.status(500).json({ error: "Unable to load website content." }); }
  }
  if (req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (!authorised(req)) return res.status(401).json({ error: "The private editor link is invalid or expired." });
  if (!token) return res.status(503).json({ error: "Website storage is not configured yet." });
  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ error: "Invalid content format." });
    const allowed = ["announcements","news","gallery","calendar","staff","achievements","parentInfo","faqs"];
    for (const key of allowed) {
      if (!Array.isArray(data[key]) || data[key].length > 250) return res.status(400).json({ error: "Invalid section: " + key });
    }
    const json = JSON.stringify(data);
    if (json.length > 900000) return res.status(413).json({ error: "The content is too large to publish." });
    const blob = await put(KEY, json, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", token });
    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    return res.status(400).json({ error: "Could not publish the content. Check the entries and try again." });
  }
}