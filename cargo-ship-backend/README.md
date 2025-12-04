# Cargo Ships Management System - Backend

A comprehensive backend system for intelligent engine room management on cargo ships, built with NestJS, TypeORM, and MySQL.

## Features

- **Authentication & Authorization**: JWT-based authentication with RBAC (Role-Based Access Control)
- **Equipment Management**: CRUD operations for ship equipment with soft delete support
- **Real-time Monitoring**: Time-series data collection and storage from equipment sensors
- **Threshold Configuration**: Configurable alarm thresholds with automatic alert generation
- **Health Assessment**: Automated health reports based on historical monitoring data
- **File Import**: Batch import of historical data from Excel/CSV files
- **Advanced Querying**: Multi-dimensional data queries and statistical analysis
- **WebSocket Support**: Real-time alarm notifications and status updates
- **Audit Logging**: Complete audit trail of all system operations

## Tech Stack

- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.x
- **Database**: MySQL 8.0+
- **ORM**: TypeORM 0.3.x
- **Authentication**: Passport.js + JWT
- **Real-time**: Socket.io
- **Validation**: class-validator + class-transformer
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js 18.x or 20.x LTS
- MySQL 8.0+
- Redis (optional, for queue processing)
- npm 8.x+

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd cargo-ships-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and configure your database connection and other settings:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=cargo_ships_db

JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

### 4. Create database

```bash
mysql -u root -p
CREATE DATABASE cargo_ships_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Run migrations

```bash
npm run migration:run
```

## Running the Application

### Development mode

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### Production mode

```bash
npm run build
npm run start:prod
```

### Debug mode

```bash
npm run start:debug
```

## Database Migrations

### Generate a new migration

```bash
npm run migration:generate -- -n MigrationName
```

### Create an empty migration

```bash
npm run migration:create -- MigrationName
```

### Run migrations

```bash
npm run migration:run
```

### Revert last migration

```bash
npm run migration:revert
```

### Show migration status

```bash
npm run migration:show
```

## Testing

### Run unit tests

```bash
npm run test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run test coverage

```bash
npm run test:cov
```

### Run E2E tests

```bash
npm run test:e2e
```

## Project Structure

See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for detailed information about the project organization.

```
src/
├── config/          # Configuration modules
├── common/          # Shared utilities (guards, interceptors, decorators)
├── database/        # Entities, migrations, seeds
├── modules/         # Feature modules
│   ├── auth/
│   ├── users/
│   ├── equipment/
│   ├── monitoring/
│   └── ...
├── app.module.ts
└── main.ts
```

## API Documentation

API documentation will be available at:
- Swagger UI: `http://localhost:3000/api/docs` (to be implemented)
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

## Architecture Decisions

### TypeScript Algorithm Integration

The system uses TypeScript-based algorithms instead of external Python services, following the principle of simplicity and rapid iteration. All health assessment and diagnostic algorithms are implemented directly in the NestJS service layer.

### WebSocket Room Mechanism

Real-time notifications use Socket.io rooms for:
- **Permission isolation**: Users only receive alerts for equipment they have access to
- **Performance optimization**: Targeted broadcasting instead of global notifications
- **Device grouping**: Subscribe to specific equipment updates

### Time-Series Data Storage

Time-series monitoring data uses MySQL with partitioning strategy:
- Monthly partitions for efficient querying
- Automatic partition management
- Indexed for time-range queries

## Configuration

All configuration is managed through environment variables and centralized config files:

- `src/config/app.config.ts` - Application settings
- `src/config/database.config.ts` - Database connection
- `src/config/jwt.config.ts` - Authentication
- `src/config/websocket.config.ts` - WebSocket settings
- `src/config/redis.config.ts` - Queue configuration
- `src/config/upload.config.ts` - File upload settings

## Development Workflow

1. Create a feature branch from `main`
2. Implement your feature in `src/modules/feature-name/`
3. Write unit tests (co-located `*.spec.ts` files)
4. Create database migrations if needed
5. Update documentation
6. Submit pull request

## Code Style

The project uses:
- ESLint for linting
- Prettier for code formatting

```bash
npm run lint        # Check for linting errors
npm run format      # Format code with Prettier
```

## Security

- All passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- RBAC for fine-grained access control
- Input validation on all endpoints using DTOs
- SQL injection prevention via TypeORM
- CORS configuration for frontend integration

## Performance Considerations

- Database connection pooling (10 connections)
- Query optimization with proper indexing
- Pagination for large datasets
- Caching strategy (to be implemented with Redis)
- WebSocket room-based broadcasting

## Troubleshooting

### Database connection errors

- Verify MySQL is running
- Check credentials in `.env`
- Ensure database exists
- Check firewall settings

### Migration errors

- Make sure database is accessible
- Check migration files for syntax errors
- Verify TypeORM configuration in `data-source.ts`

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

## Related Documentation

- [Project Specification](../../specs/001-core-api-models/spec.md)
- [Data Model Design](../../specs/001-core-api-models/data-model.md)
- [Implementation Plan](../../specs/001-core-api-models/plan.md)
- [Task Checklist](../../specs/001-core-api-models/tasks.md)
- [Research Decisions](../../specs/001-core-api-models/research.md)

## License

UNLICENSED - Private project

## Support

For questions or issues, please contact the development team.
