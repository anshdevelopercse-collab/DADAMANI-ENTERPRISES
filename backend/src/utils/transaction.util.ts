import mongoose from 'mongoose';

/**
 * Runs `fn` inside a MongoDB session/transaction, retrying automatically on
 * transient transaction errors (the standard MongoDB driver signal for a
 * write conflict between two concurrent transactions touching the same
 * document). This is the serialization mechanism the vehicle/workforce
 * double-booking guards rely on: two concurrent requests that both touch the
 * same Vehicle document will cause one transaction to abort and retry rather
 * than both succeeding.
 */
export async function runInTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;
    const session = await mongoose.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result as T;
    } catch (err: any) {
      const isTransient =
        err?.errorLabelSet?.has?.('TransientTransactionError') ||
        err?.errorLabels?.includes?.('TransientTransactionError');
      if (isTransient && attempt < maxRetries) {
        continue;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
