import { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';

export abstract class BaseRepository<T> {
  protected constructor(protected readonly model: Model<any>) {}

  async create(data: Partial<T>): Promise<T> {
    return (await this.model.create(data as any)) as unknown as T;
  }

  async insertMany(data: Partial<T>[]): Promise<T[]> {
    return ((await this.model.insertMany(data as any)) as unknown) as T[];
  }

  async findById(id: string, select?: string, populate?: any): Promise<T | null> {
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return (await query.exec()) as unknown as T | null;
  }

  async findOne(filter: FilterQuery<any>, select?: string, populate?: any): Promise<T | null> {
    let query = this.model.findOne(filter);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return (await query.exec()) as unknown as T | null;
  }

  async find(filter: FilterQuery<any> = {}, select?: string, sort: any = { createdAt: -1 }, limit?: number): Promise<T[]> {
    let query = this.model.find(filter).sort(sort);
    if (select) query = query.select(select);
    if (limit) query = query.limit(limit);
    return (await query.exec()) as unknown as T[];
  }

  async updateById(id: string, update: UpdateQuery<any>, options: QueryOptions = { new: true }): Promise<T | null> {
    return (await this.model.findByIdAndUpdate(id, update, options).exec()) as unknown as T | null;
  }

  async updateOne(filter: FilterQuery<any>, update: UpdateQuery<any>): Promise<any> {
    return this.model.updateOne(filter, update).exec();
  }

  async deleteById(id: string): Promise<T | null> {
    return (await this.model.findByIdAndDelete(id).exec()) as unknown as T | null;
  }

  async count(filter: FilterQuery<any> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async paginate(filter: FilterQuery<any> = {}, params: PaginationParams = {}, populate?: any): Promise<PaginatedResult<T>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sortBy = params.sortBy || 'createdAt';
    const sort = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort as any)
        .skip(skip)
        .limit(limit)
        .populate(populate || '')
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: (data as unknown) as T[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
