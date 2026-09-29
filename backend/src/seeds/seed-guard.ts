const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface SeedTarget {
  uri: string;
  nodeEnv: string;
  allowDestructiveSeed: string | undefined;
}

export function parseMongoHosts(uri: string): string[] {
  const match = /^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/i.exec(uri.trim());
  if (!match) return [];
  return match[1].split(',').map((h) => {
    const host = h.trim().toLowerCase();
    if (host.startsWith('[')) return host.slice(0, host.indexOf(']') + 1);
    return host.split(':')[0];
  });
}

/**
 * The seed wipes every collection it touches. It may only ever run against a
 * MongoDB on this machine, never in production, and only when the operator
 * explicitly opts in. There is deliberately no override for remote hosts.
 */
export function assertSafeSeedTarget({ uri, nodeEnv, allowDestructiveSeed }: SeedTarget): void {
  if (nodeEnv === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production".');
  }
  if (/^mongodb\+srv:\/\//i.test(uri.trim())) {
    throw new Error('Refusing to seed: the target is a mongodb+srv (Atlas / remote cluster) URI. The seed only runs against a local MongoDB.');
  }
  const hosts = parseMongoHosts(uri);
  if (hosts.length === 0 || hosts.some((h) => !LOCAL_HOSTS.has(h))) {
    throw new Error(`Refusing to seed: target host(s) [${hosts.join(', ') || 'unparseable'}] are not local. The seed only runs against localhost/127.0.0.1.`);
  }
  if (allowDestructiveSeed !== 'true') {
    throw new Error(
      'Refusing to seed: this deletes all data in the target database. Re-run with ALLOW_DESTRUCTIVE_SEED=true and MONGODB_URI pointing at a local database.'
    );
  }
}
