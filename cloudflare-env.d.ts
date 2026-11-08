declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INTEGRATION_SECRET?: string;
    WHATSAPP_SEND_ENABLED?: string;
  }
}
