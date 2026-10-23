import { eq } from 'drizzle-orm'

import { type Models } from '@/models'

import { ConflictError, ForbiddenError } from '@/server/errors/http-errors'
import { db, type DbTransaction } from '@/server/lib/db'
import { installation } from '@/server/modules/installation/schemas/installation.table'

const SINGLETON_ID = 'singleton'

export class InstallationService {
  getStatus = async (): Promise<Models.InstallationStatus> => {
    const [row] = await db
      .select({ status: installation.status })
      .from(installation)
      .where(eq(installation.id, SINGLETON_ID))
    if (row) {
      return row.status
    }
    await this.ensureRow(db)
    return 'pending'
  }

  assertPending = async (tx?: DbTransaction): Promise<void> => {
    if (!tx) {
      if ((await this.getStatus()) === 'completed') {
        throw new ForbiddenError('Installation is already completed')
      }
      return
    }
    await this.ensureRow(tx)
    const [row] = await tx
      .select({ status: installation.status })
      .from(installation)
      .where(eq(installation.id, SINGLETON_ID))
      .for('update')
    if (row?.status === 'completed') {
      throw new ForbiddenError('Installation is already completed')
    }
  }

  completeInstallation = async (tx: DbTransaction, ownerId: string): Promise<void> => {
    await this.ensureRow(tx)
    const [row] = await tx
      .select({ status: installation.status })
      .from(installation)
      .where(eq(installation.id, SINGLETON_ID))
      .for('update')
    if (row?.status === 'completed') {
      throw new ConflictError('Installation is already completed')
    }
    await tx
      .update(installation)
      .set({ status: 'completed', ownerId, completedAt: new Date() })
      .where(eq(installation.id, SINGLETON_ID))
  }

  private ensureRow = async (executor: Pick<typeof db, 'insert'>): Promise<void> => {
    await executor.insert(installation).values({ id: SINGLETON_ID }).onConflictDoNothing()
  }
}

export const installationService = new InstallationService()
