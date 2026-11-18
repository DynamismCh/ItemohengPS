import { get, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";

const KEY = "itemoheng/enquiries.json";
const token = process.env.BLOB_READ_WRITE_TOKEN;
async function readInbox() {
  const result = await get(KEY, { access: "private", token, useCache: false });
  if (result?.statusCode === 200 && result.stream) return await new Response(result.stream).json();
  return [];
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") { res.setHeader("Allow","POST"); return res.status(405).json({error:"Method not allowed."}); }
  if (!token) return res.status(503).json({error:"The enquiry service is not configured. Please contact the school directly."});
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    if (body.website) return res.status(200).json({message:"Thank you. Your enquiry has been received."});
    const name=String(body.name||"").trim(), email=String(body.email||"").trim(), message=String(body.message||"").trim();
    if (!body.consent || !name || !email || !message) return res.status(400).json({error:"Please complete all required fields and agree to the contact notice."});
    if (name.length>100 || email.length>160 || message.length>3000 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Please check your details and message, then try again."});
    const items=await readInbox();
    if (items.length>=1000) return res.status(503).json({error:"The enquiry inbox is temporarily full. Please contact the school by telephone or email."});
    items.unshift({id:randomUUID(),name,email,message,createdAt:new Date().toISOString(),status:"New"});
    await put(KEY,JSON.stringify(items),{access:"private",addRandomSuffix:false,allowOverwrite:true,contentType:"application/json",token});
    return res.status(200).json({message:"Thank you. Your enquiry has been sent successfully."});
  } catch(error) {
    console.error("[itemoheng] enquiry submission failed:",error);
    return res.status(500).json({error:"We could not send your enquiry. Please try again or contact the school directly."});
  }
}