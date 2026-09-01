import { ApiError } from '@lingcoo-tech/http';

import type { DatabaseExecutor, DatabaseHandle } from '../../../database/database.js';
import type { AssetReferenceInput } from '../domain/model.js';
import { AssetRepository } from '../infrastructure/persistence/asset.repository.js';

const OWNER_PATTERN = /^[a-z][a-z0-9._-]{0,119}$/;

export class AssetReferenceService {
  constructor(
    private readonly database: DatabaseHandle,
    private readonly assets: AssetRepository,
  ) {}

  async set(input: AssetReferenceInput, executor: DatabaseExecutor = this.database.db) {
    assertReference(input.ownerType, input.ownerId, input.field);
    if (!input.assetId) {
      await this.assets.clearReference(input.ownerType, input.ownerId, input.field, executor);
      return;
    }
    const asset = await this.assets.find(input.assetId, executor);
    if (!asset || asset.status !== 'active' || asset.deletedAt) {
      throw new ApiError(409, 'STORAGE_ASSET_NOT_REFERENCEABLE', '素材不存在或尚未上传完成');
    }
    await this.assets.setReference(
      {
        assetId: input.assetId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        field: input.field,
        createdBy: input.createdBy,
      },
      executor,
    );
  }
}

function assertReference(ownerType: string, ownerId: string, field: string): void {
  if (!OWNER_PATTERN.test(ownerType) || !OWNER_PATTERN.test(field)) {
    throw new Error('Asset reference owner type or field is invalid');
  }
  const hasControlCharacter = [...ownerId].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!ownerId.trim() || ownerId.length > 200 || hasControlCharacter) {
    throw new Error('Asset reference owner id is invalid');
  }
}
