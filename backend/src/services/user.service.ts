import crypto from 'crypto';
import { UserRepository, AuditLogRepository } from '../repositories/index.js';
import { IUserDocument } from '../interfaces/user.interface.js';
import { ApiError } from '../utils/api-response.util.js';
import { EmailService } from './email.service.js';
import { PaginationParams, PaginatedResult } from '../interfaces/common.interface.js';

export class UserService {
  private userRepo = new UserRepository();
  private auditRepo = new AuditLogRepository();

  async getUsers(params: PaginationParams): Promise<PaginatedResult<IUserDocument>> {
    const filter: any = {};
    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
        { department: { $regex: params.search, $options: 'i' } },
        { designation: { $regex: params.search, $options: 'i' } },
      ];
    }
    if (params.role) {
      filter.role = params.role;
    }
    if (params.isActive !== undefined) {
      filter.isActive = params.isActive === 'true' || params.isActive === true;
    }

    return this.userRepo.paginate(filter, params);
  }

  async getUserById(id: string): Promise<IUserDocument> {
    const user = await this.userRepo.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async createUser(data: any, createdById?: string): Promise<{ user: IUserDocument; tempPass: string }> {
    const existing = await this.userRepo.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('A user with this email address already exists');
    }

    const tempPassword = data.password || `Dada@${crypto.randomBytes(3).toString('hex')}!`;
    const user = await this.userRepo.create({
      ...data,
      email: data.email.toLowerCase(),
      password: tempPassword,
      createdBy: createdById as any,
    });

    // Send Welcome Email with temporary password
    await EmailService.sendWelcomeEmail(user.email, user.name, tempPassword, user.role);

    return { user, tempPass: tempPassword };
  }

  async updateUser(id: string, data: any): Promise<IUserDocument> {
    const user = await this.userRepo.updateById(id, data);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async toggleUserStatus(id: string): Promise<IUserDocument> {
    const user = await this.getUserById(id);
    user.isActive = !user.isActive;
    await user.save();
    return user;
  }

  async resetUserPassword(id: string): Promise<{ tempPass: string }> {
    const user = await this.getUserById(id);
    const tempPassword = `Reset@${crypto.randomBytes(3).toString('hex')}!`;
    user.password = tempPassword;
    await user.save();

    await EmailService.sendWelcomeEmail(user.email, user.name, tempPassword, user.role);
    return { tempPass: tempPassword };
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    await this.userRepo.deleteById(id);
  }
}
