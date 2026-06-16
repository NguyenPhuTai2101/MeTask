import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET || "metask_default_session_secret_32_bytes_long_minimum!";
// Ensure key is exactly 32 bytes for AES-256
const KEY = crypto.scryptSync(SESSION_SECRET, "salt", 32);
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role?: string;
  systemRole?: string;
  status?: string;
}

export function encryptSession(data: SessionPayload): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag().toString("hex");
  
  // Format: iv:encrypted:authTag
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export function decryptSession(token: string): SessionPayload | null {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return null;
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted as any, undefined, "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted) as SessionPayload;
  } catch (error) {
    console.error("Session decryption failed:", error);
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = "metask_salt";
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("metask_session")?.value;
  if (sessionCookie) {
    return decryptSession(sessionCookie);
  }
  return null;
}
