import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

const PUBLIC_USER = { id: true, email: true, name: true, role: true } as const;

@Injectable()
export class AuthService {
  private readonly rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  // Used to spend the same time on "unknown email" as on "wrong password".
  private readonly dummyHash = bcrypt.hashSync('not-a-real-password', this.rounds);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, this.rounds);
    try {
      // Role is never taken from the request: everyone who registers is a USER.
      return await this.prisma.user.create({
        data: { email: dto.email.toLowerCase(), name: dto.name, passwordHash },
        select: PUBLIC_USER,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists',
        });
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  signToken(userId: string) {
    return this.jwt.signAsync({ sub: userId });
  }
}
