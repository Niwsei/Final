# AGENT.md - FinTwin Development Guide

> **Expert-Level Development Standards for FinTwin Financial System**
> 
> Version: 1.0.0 | Last Updated: January 2026

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Backend Structure](#backend-structure)
4. [Frontend Structure](#frontend-structure)
5. [AI Module Structure](#ai-module-structure)
6. [Security Standards](#security-standards)
7. [Clean Code Principles](#clean-code-principles)
8. [Testing Strategy](#testing-strategy)
9. [Documentation Standards](#documentation-standards)
10. [Development Workflow](#development-workflow)

---

## 🎯 Project Overview

**FinTwin** เป็นระบบการเงินที่ใช้ AI ในการวิเคราะห์และให้คำแนะนำทางการเงิน โดยมุ่งเน้นความปลอดภัย, scalability และ maintainability

### Core Values
- **Security First**: ทุกการตัดสินใจต้องคำนึงถึงความปลอดภัยเป็นอันดับแรก
- **Clean Architecture**: แยก concerns อย่างชัดเจน
- **Test-Driven**: Coverage ขั้นต่ำ 80%
- **Performance**: Response time < 200ms for 95th percentile
- **Maintainability**: Code ต้องอ่านง่าย เข้าใจง่าย แก้ไขง่าย

---

## 🏗️ Architecture Philosophy

### Layered Architecture
```
┌─────────────────────────────────────┐
│         Presentation Layer          │ (Frontend/API)
├─────────────────────────────────────┤
│         Application Layer           │ (Controllers/Routes)
├─────────────────────────────────────┤
│          Business Layer             │ (Services/Use Cases)
├─────────────────────────────────────┤
│          Data Access Layer          │ (Repositories)
├─────────────────────────────────────┤
│         Infrastructure Layer        │ (Database/External APIs)
└─────────────────────────────────────┘
```

### Design Principles
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **Separation of Concerns**: แยกส่วนที่ทำงานต่างกันออกจากกัน

---

## 🔧 Backend Structure

### Directory Structure
```
backend/
├── src/
│   ├── controllers/          # HTTP request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── transaction.controller.ts
│   │   └── index.ts
│   ├── services/             # Business logic
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── transaction.service.ts
│   │   └── index.ts
│   ├── models/               # Data models/entities
│   │   ├── user.model.ts
│   │   ├── transaction.model.ts
│   │   └── index.ts
│   ├── repositories/         # Data access layer
│   │   ├── user.repository.ts
│   │   ├── transaction.repository.ts
│   │   └── index.ts
│   ├── routes/               # API routes
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── transaction.routes.ts
│   │   └── index.ts
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── security.middleware.ts
│   │   └── index.ts
│   ├── validation/           # Input validation schemas
│   │   ├── auth.validation.ts
│   │   ├── user.validation.ts
│   │   ├── transaction.validation.ts
│   │   └── index.ts
│   ├── utils/                # Utility functions
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   ├── date.ts
│   │   ├── response.ts
│   │   └── index.ts
│   ├── errors/               # Custom error classes
│   │   ├── app-error.ts
│   │   ├── validation-error.ts
│   │   ├── auth-error.ts
│   │   └── index.ts
│   ├── config/               # Configuration
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── jwt.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── types/                # TypeScript types/interfaces
│   │   ├── express.d.ts
│   │   ├── common.types.ts
│   │   └── index.ts
│   ├── docs/                 # API documentation
│   │   ├── swagger.ts
│   │   └── api-spec.yaml
│   ├── __tests__/            # Test files
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── app.ts                # Express app setup
│   └── server.ts             # Server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Backend Standards

#### 1. Controllers
```typescript
// ❌ BAD - ทำงานหลายอย่างใน controller
export class UserController {
  async createUser(req: Request, res: Response) {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.users.insert({ email, password: hashedPassword });
    const token = jwt.sign({ id: user.id }, SECRET);
    res.json({ user, token });
  }
}

// ✅ GOOD - แยก concerns ชัดเจน
export class UserController {
  constructor(private userService: UserService) {}

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateUserDto;
      const result = await this.userService.createUser(dto);
      
      res.status(HttpStatus.CREATED).json({
        success: true,
        data: result,
        message: 'User created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
```

**Controller Rules:**
- ไม่มี business logic
- รับ request, เรียก service, ส่ง response
- Handle errors ด้วย try-catch และส่งต่อไปที่ error middleware
- ใช้ dependency injection
- มี JSDoc comment

#### 2. Services
```typescript
// ✅ GOOD - Service pattern
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    private emailService: EmailService
  ) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    // 1. Validate business rules
    await this.validateUserCreation(dto);
    
    // 2. Hash password
    const hashedPassword = await this.authService.hashPassword(dto.password);
    
    // 3. Create user
    const user = await this.userRepository.create({
      ...dto,
      password: hashedPassword
    });
    
    // 4. Send welcome email (async, don't wait)
    this.emailService.sendWelcomeEmail(user.email).catch(err => 
      logger.error('Failed to send welcome email', err)
    );
    
    // 5. Return DTO (never return entity directly)
    return this.mapToResponseDto(user);
  }

  private async validateUserCreation(dto: CreateUserDto): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('Email already exists');
    }
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt
      // Never expose password or sensitive data
    };
  }
}
```

**Service Rules:**
- เป็นที่รวม business logic
- ใช้ repositories เพื่อเข้าถึงข้อมูล
- ใช้ DTOs สำหรับ input/output
- Handle business validation
- Throw domain-specific errors
- Transaction management
- Single Responsibility

#### 3. Repositories
```typescript
// ✅ GOOD - Repository pattern
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      logger.error('Error finding user by id', { id, error });
      throw new DatabaseError('Failed to find user');
    }
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const [user] = await this.db
        .insert(users)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return user;
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictError('User already exists');
      }
      logger.error('Error creating user', { data, error });
      throw new DatabaseError('Failed to create user');
    }
  }
}
```

**Repository Rules:**
- เป็นชั้นเดียวที่เข้าถึง database
- ใช้ interface เพื่อ testability
- Handle database errors และแปลงเป็น domain errors
- ไม่มี business logic
- Log errors ก่อน throw

#### 4. Validation
```typescript
// ✅ GOOD - Using Zod for validation
import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase')
      .regex(/[a-z]/, 'Password must contain lowercase')
      .regex(/[0-9]/, 'Password must contain number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
    fullName: z.string().min(2).max(100),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    dateOfBirth: z.string().datetime().optional()
  })
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID')
  }),
  body: z.object({
    amount: z.number().positive().max(1000000),
    description: z.string().max(500).optional(),
    category: z.enum(['food', 'transport', 'shopping', 'bills', 'other'])
  })
});

// Middleware usage
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};
```

**Validation Rules:**
- ใช้ Zod หรือ Joi สำหรับ schema validation
- Validate ที่ boundary (middleware)
- Error messages ต้องชัดเจน
- Sanitize input (trim, escape)
- Validate business rules ใน service layer

#### 5. Error Handling
```typescript
// ✅ GOOD - Custom error classes
export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string, public errors?: any[]) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  isOperational = true;
}

export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
}

export class ConflictError extends AppError {
  statusCode = 409;
  isOperational = true;
}

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error instanceof ValidationError ? error.errors : undefined
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Don't expose internal errors to client
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
```

#### 6. Middleware
```typescript
// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};

// Authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// Rate limiting
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Request logging
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  next();
};
```

#### 7. Configuration
```typescript
// ✅ GOOD - Type-safe configuration
import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform(Number).default('10'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

export const config = configSchema.parse(process.env);

// Usage
import { config } from './config';
const token = jwt.sign(payload, config.JWT_SECRET, {
  expiresIn: config.JWT_EXPIRES_IN
});
```

---

## 🎨 Frontend Structure

### Directory Structure
```
frontend/
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── (auth)/          # Route groups
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── overview/
│   │   │   ├── transactions/
│   │   │   └── analytics/
│   │   ├── api/             # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   │   ├── button/
│   │   │   ├── input/
│   │   │   ├── modal/
│   │   │   └── index.ts
│   │   ├── features/       # Feature-specific components
│   │   │   ├── auth/
│   │   │   ├── transactions/
│   │   │   └── dashboard/
│   │   ├── layouts/        # Layout components
│   │   └── shared/         # Shared components
│   ├── lib/                # Core libraries
│   │   ├── api/           # API client
│   │   │   ├── client.ts
│   │   │   ├── endpoints/
│   │   │   └── types.ts
│   │   ├── hooks/         # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useQuery.ts
│   │   │   └── index.ts
│   │   ├── utils/         # Utility functions
│   │   │   ├── format.ts
│   │   │   ├── validation.ts
│   │   │   └── index.ts
│   │   └── constants/     # Constants
│   ├── store/             # State management
│   │   ├── slices/
│   │   ├── hooks.ts
│   │   └── index.ts
│   ├── types/             # TypeScript types
│   │   ├── api.types.ts
│   │   ├── models.types.ts
│   │   └── index.ts
│   ├── styles/            # Global styles
│   │   ├── globals.css
│   │   └── theme.ts
│   ├── __tests__/         # Test files
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── middleware.ts      # Next.js middleware
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── .env.example
```

### Frontend Standards

#### 1. Component Structure
```typescript
// ✅ GOOD - Well-structured component
import { FC, useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { useTransaction } from '@/lib/hooks/useTransaction';
import type { Transaction } from '@/types/models.types';

interface TransactionCardProps {
  transaction: Transaction;
  onUpdate?: (transaction: Transaction) => void;
  className?: string;
}

/**
 * TransactionCard component displays transaction details
 * 
 * @param transaction - Transaction object to display
 * @param onUpdate - Optional callback when transaction is updated
 * @param className - Optional CSS classes
 */
export const TransactionCard: FC<TransactionCardProps> = memo(({
  transaction,
  onUpdate,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { updateTransaction, isLoading } = useTransaction();

  const handleUpdate = useCallback(async (data: Partial<Transaction>) => {
    try {
      const updated = await updateTransaction(transaction.id, data);
      onUpdate?.(updated);
      setIsEditing(false);
    } catch (error) {
      // Error handled by hook
    }
  }, [transaction.id, updateTransaction, onUpdate]);

  return (
    <div className={`transaction-card ${className}`}>
      {/* Component content */}
    </div>
  );
});

TransactionCard.displayName = 'TransactionCard';
```

**Component Rules:**
- Use functional components
- TypeScript interfaces for props
- Memoize เมื่อจำเป็น
- Custom hooks สำหรับ logic ที่ซับซ้อน
- JSDoc comments
- Proper error boundaries

#### 2. Custom Hooks
```typescript
// ✅ GOOD - Custom hook
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Transaction } from '@/types/models.types';

interface UseTransactionReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createTransaction: (data: CreateTransactionDto) => Promise<Transaction>;
  updateTransaction: (id: string, data: UpdateTransactionDto) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransaction = (): UseTransactionReturn => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.transactions.getAll();
      setTransactions(data);
    } catch (err) {
      setError(err as Error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTransaction = useCallback(async (data: CreateTransactionDto) => {
    try {
      const newTransaction = await api.transactions.create(data);
      setTransactions(prev => [newTransaction, ...prev]);
      toast.success('Transaction created');
      return newTransaction;
    } catch (err) {
      toast.error('Failed to create transaction');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refetch: fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
  };
};
```

#### 3. API Client
```typescript
// ✅ GOOD - Type-safe API client
import axios, { AxiosInstance, AxiosError } from 'axios';
import { toast } from 'sonner';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          window.location.href = '/login';
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    const message = error.response?.data?.message || 'An error occurred';
    return new Error(message);
  }

  // Transaction endpoints
  transactions = {
    getAll: () => this.client.get<Transaction[]>('/transactions'),
    getById: (id: string) => this.client.get<Transaction>(`/transactions/${id}`),
    create: (data: CreateTransactionDto) => 
      this.client.post<Transaction>('/transactions', data),
    update: (id: string, data: UpdateTransactionDto) =>
      this.client.patch<Transaction>(`/transactions/${id}`, data),
    delete: (id: string) => this.client.delete(`/transactions/${id}`)
  };
}

export const api = new ApiClient();
```

#### 4. State Management
```typescript
// ✅ GOOD - Redux Toolkit slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import type { User } from '@/types/models.types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: false,
  error: null
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginDto, { rejectWithValue }) => {
    try {
      const response = await api.auth.login(credentials);
      localStorage.setItem('token', response.token);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
```

---

## 🤖 AI Module Structure

### Directory Structure
```
ai/
├── src/
│   ├── models/              # AI model definitions
│   │   ├── risk_assessment/
│   │   ├── fraud_detection/
│   │   ├── recommendation/
│   │   └── prediction/
│   ├── services/            # AI services
│   │   ├── training.service.ts
│   │   ├── inference.service.ts
│   │   ├── preprocessing.service.ts
│   │   └── index.ts
│   ├── pipelines/           # ML pipelines
│   │   ├── data_pipeline.ts
│   │   ├── feature_pipeline.ts
│   │   └── training_pipeline.ts
│   ├── utils/               # Utility functions
│   │   ├── data_preprocessing.ts
│   │   ├── feature_engineering.ts
│   │   ├── model_evaluation.ts
│   │   └── index.ts
│   ├── api/                 # API endpoints
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   ├── config/              # Configuration
│   │   ├── model_config.ts
│   │   ├── training_config.ts
│   │   └── index.ts
│   ├── __tests__/           # Test files
│   │   ├── models/
│   │   ├── services/
│   │   └── pipelines/
│   └── experiments/         # ML experiments
│       ├── notebooks/
│       └── results/
├── data/                    # Training data
│   ├── raw/
│   ├── processed/
│   └── features/
├── models/                  # Saved models
│   ├── production/
│   └── staging/
├── requirements.txt
├── pyproject.toml
└── README.md
```

### AI Standards

#### 1. Model Service
```python
# ✅ GOOD - Model service with proper error handling
from typing import Dict, List, Optional
import numpy as np
from sklearn.base import BaseEstimator
import joblib
import logging

logger = logging.getLogger(__name__)

class RiskAssessmentService:
    """
    Service for assessing financial risk using ML models.
    
    This service provides risk assessment predictions with confidence scores
    and explains the factors contributing to the risk score.
    """
    
    def __init__(self, model_path: str, threshold: float = 0.7):
        """
        Initialize the risk assessment service.
        
        Args:
            model_path: Path to the trained model file
            threshold: Risk threshold for classification (0-1)
        """
        self.model = self._load_model(model_path)
        self.threshold = threshold
        self.feature_names = self._get_feature_names()
        
    def _load_model(self, path: str) -> BaseEstimator:
        """Load trained model from disk with error handling."""
        try:
            model = joblib.load(path)
            logger.info(f"Model loaded successfully from {path}")
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            raise
    
    def predict(
        self,
        features: Dict[str, float],
        return_explanation: bool = True
    ) -> Dict:
        """
        Predict risk score for given features.
        
        Args:
            features: Dictionary of feature names and values
            return_explanation: Whether to include explanation
            
        Returns:
            Dictionary containing prediction and optional explanation
        """
        try:
            # Validate input
            self._validate_features(features)
            
            # Preprocess features
            X = self._preprocess_features(features)
            
            # Get prediction
            risk_score = self.model.predict_proba(X)[0][1]
            risk_level = self._get_risk_level(risk_score)
            
            result = {
                'risk_score': float(risk_score),
                'risk_level': risk_level,
                'timestamp': datetime.now().isoformat()
            }
            
            # Add explanation if requested
            if return_explanation:
                result['explanation'] = self._explain_prediction(X, risk_score)
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise
    
    def _validate_features(self, features: Dict[str, float]) -> None:
        """Validate that all required features are present."""
        missing = set(self.feature_names) - set(features.keys())
        if missing:
            raise ValueError(f"Missing features: {missing}")
    
    def _preprocess_features(self, features: Dict[str, float]) -> np.ndarray:
        """Preprocess features for model input."""
        # Implement feature preprocessing
        # - Scaling
        # - Encoding
        # - Missing value handling
        pass
    
    def _explain_prediction(
        self,
        X: np.ndarray,
        risk_score: float
    ) -> Dict:
        """
        Explain model prediction using SHAP or similar.
        
        Returns explanation of top contributing factors.
        """
        # Implement model explainability
        pass
    
    def _get_risk_level(self, score: float) -> str:
        """Convert risk score to categorical level."""
        if score < 0.3:
            return 'low'
        elif score < 0.7:
            return 'medium'
        else:
            return 'high'
```

#### 2. Data Pipeline
```python
# ✅ GOOD - Robust data pipeline
from typing import Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import logging

logger = logging.getLogger(__name__)

class DataPipeline:
    """
    Pipeline for data preprocessing and feature engineering.
    
    Handles data loading, cleaning, feature engineering,
    and train/test splitting with proper validation.
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.scaler = StandardScaler()
        self.feature_engineering_steps = []
        
    def load_data(self, path: str) -> pd.DataFrame:
        """
        Load data from file with validation.
        
        Args:
            path: Path to data file
            
        Returns:
            Loaded DataFrame
            
        Raises:
            ValueError: If data is invalid
        """
        try:
            df = pd.read_csv(path)
            logger.info(f"Loaded {len(df)} rows from {path}")
            
            # Validate data
            self._validate_data(df)
            
            return df
        except Exception as e:
            logger.error(f"Failed to load data: {str(e)}")
            raise
    
    def preprocess(
        self,
        df: pd.DataFrame,
        fit_scaler: bool = False
    ) -> pd.DataFrame:
        """
        Preprocess data with standardized steps.
        
        Args:
            df: Input DataFrame
            fit_scaler: Whether to fit scaler (True for training data)
            
        Returns:
            Preprocessed DataFrame
        """
        logger.info("Starting preprocessing...")
        
        # 1. Handle missing values
        df = self._handle_missing_values(df)
        
        # 2. Remove outliers
        df = self._remove_outliers(df)
        
        # 3. Feature engineering
        df = self._engineer_features(df)
        
        # 4. Encode categorical variables
        df = self._encode_categorical(df)
        
        # 5. Scale numerical features
        if fit_scaler:
            df = self._fit_transform_scaler(df)
        else:
            df = self._transform_scaler(df)
        
        logger.info("Preprocessing completed")
        return df
    
    def split_data(
        self,
        df: pd.DataFrame,
        target_col: str,
        test_size: float = 0.2,
        stratify: bool = True
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
        """
        Split data into train and test sets.
        
        Args:
            df: Input DataFrame
            target_col: Name of target column
            test_size: Proportion of test set
            stratify: Whether to stratify by target
            
        Returns:
            X_train, X_test, y_train, y_test
        """
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        stratify_col = y if stratify else None
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y,
            test_size=test_size,
            stratify=stratify_col,
            random_state=self.config.get('random_state', 42)
        )
        
        logger.info(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
        
        return X_train, X_test, y_train, y_test
    
    def _validate_data(self, df: pd.DataFrame) -> None:
        """Validate data quality and schema."""
        required_cols = self.config.get('required_columns', [])
        missing_cols = set(required_cols) - set(df.columns)
        
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Check for excessive missing values
        missing_pct = (df.isnull().sum() / len(df)) * 100
        problematic = missing_pct[missing_pct > 50]
        
        if not problematic.empty:
            logger.warning(f"Columns with >50% missing: {problematic.to_dict()}")
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values based on strategy."""
        # Implement missing value handling
        # - Mean/median for numerical
        # - Mode for categorical
        # - Forward fill for time series
        pass
    
    def _engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create derived features."""
        # Example: Financial ratios, aggregations, etc.
        pass
```

#### 3. Model Training
```python
# ✅ GOOD - MLOps-ready training pipeline
import mlflow
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score
)

class ModelTrainer:
    """
    Trainer for ML models with experiment tracking.
    
    Handles model training, evaluation, and versioning
    with MLflow integration for experiment tracking.
    """
    
    def __init__(self, config: Dict):
        self.config = config
        mlflow.set_tracking_uri(config['mlflow_uri'])
        mlflow.set_experiment(config['experiment_name'])
    
    def train(
        self,
        model: BaseEstimator,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: Optional[pd.DataFrame] = None,
        y_val: Optional[pd.Series] = None
    ) -> BaseEstimator:
        """
        Train model with proper logging and validation.
        
        Args:
            model: Scikit-learn model to train
            X_train: Training features
            y_train: Training target
            X_val: Validation features (optional)
            y_val: Validation target (optional)
            
        Returns:
            Trained model
        """
        with mlflow.start_run():
            # Log parameters
            self._log_params(model)
            
            # Train model
            logger.info("Training model...")
            model.fit(X_train, y_train)
            
            # Evaluate on training set
            train_metrics = self._evaluate(model, X_train, y_train)
            self._log_metrics(train_metrics, prefix='train_')
            
            # Evaluate on validation set if provided
            if X_val is not None and y_val is not None:
                val_metrics = self._evaluate(model, X_val, y_val)
                self._log_metrics(val_metrics, prefix='val_')
            
            # Save model
            mlflow.sklearn.log_model(model, "model")
            
            # Log feature importance
            self._log_feature_importance(model, X_train.columns)
            
            logger.info("Training completed")
            
        return model
    
    def _evaluate(
        self,
        model: BaseEstimator,
        X: pd.DataFrame,
        y: pd.Series
    ) -> Dict[str, float]:
        """Compute comprehensive evaluation metrics."""
        y_pred = model.predict(X)
        y_pred_proba = model.predict_proba(X)[:, 1]
        
        metrics = {
            'accuracy': accuracy_score(y, y_pred),
            'precision': precision_score(y, y_pred),
            'recall': recall_score(y, y_pred),
            'f1': f1_score(y, y_pred),
            'roc_auc': roc_auc_score(y, y_pred_proba)
        }
        
        return metrics
    
    def _log_params(self, model: BaseEstimator) -> None:
        """Log model hyperparameters."""
        params = model.get_params()
        mlflow.log_params(params)
    
    def _log_metrics(
        self,
        metrics: Dict[str, float],
        prefix: str = ''
    ) -> None:
        """Log evaluation metrics."""
        prefixed_metrics = {f"{prefix}{k}": v for k, v in metrics.items()}
        mlflow.log_metrics(prefixed_metrics)
    
    def _log_feature_importance(
        self,
        model: BaseEstimator,
        feature_names: List[str]
    ) -> None:
        """Log feature importance if available."""
        if hasattr(model, 'feature_importances_'):
            importance_df = pd.DataFrame({
                'feature': feature_names,
                'importance': model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            mlflow.log_dict(
                importance_df.to_dict(),
                "feature_importance.json"
            )
```

---

## 🔒 Security Standards

### 1. Authentication & Authorization
```typescript
// ✅ GOOD - Secure JWT implementation
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

export class AuthService {
  private readonly JWT_SECRET = config.JWT_SECRET;
  private readonly JWT_REFRESH_SECRET = config.JWT_REFRESH_SECRET;
  private readonly JWT_EXPIRES_IN = '15m';
  private readonly REFRESH_EXPIRES_IN = '7d';
  
  async hashPassword(password: string): Promise<string> {
    // Use high cost factor for bcrypt
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { userId, role },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN, algorithm: 'HS256' }
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_EXPIRES_IN, algorithm: 'HS256' }
    );
    
    return { accessToken, refreshToken };
  }
  
  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
  
  // CSRF token generation
  generateCSRFToken(): string {
    return randomBytes(32).toString('hex');
  }
}
```

### 2. Input Sanitization
```typescript
// ✅ GOOD - Comprehensive input sanitization
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export class SanitizationService {
  sanitizeString(input: string): string {
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Escape HTML
    sanitized = validator.escape(sanitized);
    
    return sanitized;
  }
  
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'],
      ALLOWED_ATTR: ['href']
    });
  }
  
  sanitizeEmail(email: string): string {
    const normalized = validator.normalizeEmail(email) || '';
    if (!validator.isEmail(normalized)) {
      throw new ValidationError('Invalid email format');
    }
    return normalized;
  }
  
  sanitizeSQL(input: string): string {
    // Use parameterized queries instead!
    // This is just for extra safety
    return input.replace(/['";\\]/g, '');
  }
}
```

### 3. Rate Limiting
```typescript
// ✅ GOOD - Advanced rate limiting
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from './config/redis';

// Global rate limiter
export const globalLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});

// Auth endpoint limiter (stricter)
export const authLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts'
});

// Transaction endpoint limiter
export const transactionLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many transactions'
});
```

### 4. Data Encryption
```typescript
// ✅ GOOD - Secure encryption service
import crypto from 'crypto';

export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly KEY = Buffer.from(config.ENCRYPTION_KEY, 'hex');
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      this.KEY,
      iv,
      { authTag }
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}