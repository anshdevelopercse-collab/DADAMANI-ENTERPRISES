import { assertSafeSeedTarget, parseMongoHosts } from '../seeds/seed-guard.js';

describe('seed safety guard', () => {
  const ok = { nodeEnv: 'development', allowDestructiveSeed: 'true' };

  it('refuses the Atlas SRV URI from .env even with the opt-in flag', () => {
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb+srv://user:pass@cluster0.example.mongodb.net/dada_mani_erp' })).toThrow(/Atlas/);
  });

  it('refuses any non-local host, including mixed replica-set host lists', () => {
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb://db.example.com:27017/app' })).toThrow(/not local/);
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb://localhost:27017,10.0.0.5:27017/app?replicaSet=rs0' })).toThrow(/not local/);
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb://127.0.0.1.evil.com/app' })).toThrow(/not local/);
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'not a uri' })).toThrow();
  });

  it('refuses in production', () => {
    expect(() => assertSafeSeedTarget({ ...ok, nodeEnv: 'production', uri: 'mongodb://127.0.0.1:27017/app' })).toThrow(/production/);
  });

  it('requires the explicit ALLOW_DESTRUCTIVE_SEED=true opt-in', () => {
    expect(() => assertSafeSeedTarget({ ...ok, allowDestructiveSeed: undefined, uri: 'mongodb://127.0.0.1:27017/app' })).toThrow(/ALLOW_DESTRUCTIVE_SEED/);
    expect(() => assertSafeSeedTarget({ ...ok, allowDestructiveSeed: 'yes', uri: 'mongodb://127.0.0.1:27017/app' })).toThrow(/ALLOW_DESTRUCTIVE_SEED/);
  });

  it('allows a local target with the opt-in flag', () => {
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb://127.0.0.1:27017/dm_local' })).not.toThrow();
    expect(() => assertSafeSeedTarget({ ...ok, uri: 'mongodb://user:pw@localhost/dm_local' })).not.toThrow();
  });

  it('parses host lists', () => {
    expect(parseMongoHosts('mongodb://u:p@a:1,b:2/db')).toEqual(['a', 'b']);
    expect(parseMongoHosts('mongodb://[::1]:27017/db')).toEqual(['[::1]']);
  });
});
