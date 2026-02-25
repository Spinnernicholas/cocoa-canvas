import type { ArcGISError, ResolveOptions } from "./types";

interface FetchResult<T> {
  url: string;
  data: T;
}

class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

/**
 * HTTP fetcher with retry, caching, and concurrency control
 */
export class Fetcher {
  private cache = new Map<string, Promise<FetchResult<any>>>();
  private limiter: ConcurrencyLimiter;

  constructor(private options: ResolveOptions) {
    this.limiter = new ConcurrencyLimiter(options.concurrency ?? 8);
  }

  async getJson<T = any>(url: string): Promise<FetchResult<T>> {
    const requestUrl = this.withParams(url);
    if (!this.cache.has(requestUrl)) {
      this.cache.set(requestUrl, this.limiter.run(() => this.fetchJson<T>(requestUrl)));
    }
    return this.cache.get(requestUrl)!;
  }

  private withParams(url: string): string {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("f")) {
      parsed.searchParams.set("f", "json");
    }
    return parsed.toString();
  }

  private async getToken(): Promise<string | undefined> {
    const auth = this.options.auth;
    if (!auth) {
      return undefined;
    }
    if ("getToken" in auth) {
      return auth.getToken();
    }
    return auth.token;
  }

  private async fetchJson<T>(url: string): Promise<FetchResult<T>> {
    const token = await this.getToken();
    const requestUrl = token ? this.appendToken(url, token) : url;

    const attempt = async (triesLeft: number): Promise<FetchResult<T>> => {
      const response = await fetch(requestUrl, { signal: this.options.signal });
      const contentType = response.headers.get("content-type") ?? "";
      const text = await response.text();

      if (!response.ok) {
        if (triesLeft > 0 && (response.status === 429 || response.status >= 500)) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (3 - triesLeft)));
          return attempt(triesLeft - 1);
        }
        throw new Error(`Request failed (${response.status}) for ${requestUrl}`);
      }

      if (text.trim().startsWith("<")) {
        throw new Error(`Unexpected HTML response for ${requestUrl}`);
      }

      let data: any = text;
      if (contentType.includes("application/json") || text.trim().startsWith("{")) {
        data = JSON.parse(text);
        const arcgisError = (data as { error?: ArcGISError }).error;
        if (arcgisError?.message) {
          throw new Error(`ArcGIS error: ${arcgisError.message}`);
        }
      }

      return { url: requestUrl, data };
    };

    return attempt(2);
  }

  private appendToken(url: string, token: string): string {
    const parsed = new URL(url);
    parsed.searchParams.set("token", token);
    return parsed.toString();
  }
}
