import { createRemoteJWKSet, jwtVerify } from "jose";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "metask-38f20";

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

const adminAuth = {
  verifyIdToken: async (token: string) => {
    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });
      if (!payload.sub) {
        throw new Error("Invalid token: missing subject (uid)");
      }

      return {
        uid: payload.sub as string,
        email: payload.email as string,
        ...payload,
      };
    } catch (error) {
      console.error("Token verification failed:", error);
      throw new Error("Invalid token");
    }
  },
};

export { adminAuth };
