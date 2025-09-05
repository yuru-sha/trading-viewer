# Clean Architecture Implementation

This document describes the Clean Architecture implementation in the TradingViewer frontend application.

## Architecture Overview

The application follows Clean Architecture principles with the following layer structure:

```
apps/client/src/
├── domain/              # Domain Layer (Business Logic)
├── application/         # Application Layer (Use Cases)
├── infrastructure/      # Infrastructure Layer (External Concerns)
│   └── di/             # Dependency Injection Container
├── controllers/         # Controllers Layer (Application Entry Points)
├── presentation/        # Presentation Layer (UI Components)
└── bootstrap.ts         # Application Bootstrap
```

## Layer Descriptions

### Domain Layer (`/domain/`)

Contains the core business logic and rules. This layer is independent of external frameworks and libraries.

- **`entities/`** - Business entities and data structures
  - `User.ts` - User domain model and preferences
  - `Chart.ts` - Chart-related entities and configurations
  - `MarketData.ts` - Market data, symbols, alerts, and news entities

- **`repositories/`** - Abstract repository interfaces
  - `UserRepository.ts` - User data access interface
  - `ChartRepository.ts` - Chart data access interface
  - `MarketDataRepository.ts` - Market data access interface

- **`services/`** - Domain services for complex business logic
  - `ChartAnalysisService.ts` - Technical analysis and indicator calculations

- **`value-objects/`** - Immutable value objects
  - `Money.ts` - Money value object with currency support

- **`events/`** - Domain events for decoupling
  - `DomainEvent.ts` - Event definitions for user actions, chart interactions, etc.

### Application Layer (`/application/`)

Contains application-specific business logic and orchestrates the flow between domain and infrastructure layers.

- **`use-cases/`** - Application use cases organized by feature
  - `auth/AuthenticateUser.ts` - User authentication logic
  - `chart/LoadChartData.ts` - Chart data loading with indicators
  - `market/CreateAlert.ts` - Alert creation with validation

- **`services/`** - Application services for coordinating domain operations
  - `ChartService.ts` - Chart configuration and drawing management

- **`dtos/`** - Data Transfer Objects for external communication
  - `ChartDTO.ts` - Data structures for API communication

- **`ports/`** - Abstract interfaces for external services
  - `WebSocketPort.ts` - WebSocket communication interface

### Infrastructure Layer (`/infrastructure/`)

Implements external concerns and adapts external libraries to our domain interfaces.

- **`api/`** - API client implementations
  - `TradingViewerApiClient.ts` - Main API client for backend communication

- **`repositories/`** - Concrete repository implementations
  - `ApiUserRepository.ts` - User repository using REST API
  - `ApiChartRepository.ts` - Chart repository using REST API

- **`services/`** - Infrastructure service implementations
  - `ChartAnalysisServiceImpl.ts` - Technical analysis implementation

- **`websocket/`** - WebSocket adapter implementation
  - `WebSocketAdapter.ts` - WebSocket communication adapter

- **`di/`** - Dependency Injection Container
  - `container.ts` - DI configuration and registration

### Presentation Layer (`/presentation/`)

Contains UI components, hooks, and presentation logic. This layer depends on the application layer.

- **`components/`** - React components (moved from `/components/`)
  - All existing UI components organized by feature

- **`hooks/`** - React hooks for UI state and effects (moved from `/hooks/`)
  - Chart hooks, drawing hooks, layout hooks, etc.

- **`pages/`** - Page components (moved from `/pages/`)
  - All route-level page components

- **`context/`** - React context providers (moved from `/contexts/`)
  - Global state management contexts

### Controllers Layer (`/controllers/`)

Contains controllers that coordinate between the presentation layer and application use cases.

- **`AuthController.ts`** - Authentication operations controller
- **`ChartController.ts`** - Chart operations controller
- Handles error management and response formatting
- Acts as the entry point for presentation layer interactions

### Bootstrap (`/bootstrap.ts`)

Application initialization and setup logic, similar to server-side bootstrap pattern.

## Key Principles

### 1. Dependency Inversion

- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Infrastructure implements domain interfaces

### 2. Single Responsibility

- Each class/module has one reason to change
- Clear separation of concerns across layers

### 3. Interface Segregation

- Small, focused interfaces
- Clients don't depend on interfaces they don't use

### 4. Dependency Injection

- Dependencies are injected rather than created
- Easier testing and flexibility

## Data Flow

```
User Interaction → Presentation → Controllers → Application → Domain ← Infrastructure
                                                     ↓
                                             External Systems
```

1. **User Interaction**: User interacts with React components
2. **Presentation**: Components call controllers for business operations
3. **Controllers**: Coordinate use cases and handle errors/responses
4. **Application**: Use cases orchestrate domain services and repositories
5. **Domain**: Contains business logic and rules
6. **Infrastructure**: Implements external communications (API, WebSocket)

## Usage Examples

### Using a Controller in a Component

```typescript
import { getChartController } from '../../../infrastructure/di/container'

export const ChartComponent: React.FC = () => {
  const chartController = getChartController()

  const loadData = async (symbol: string, interval: string) => {
    try {
      const result = await chartController.getChartData({
        symbol,
        interval,
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        to: new Date(),
        userId: getCurrentUserId(),
      })

      // Use result.data, result.config, result.indicators
    } catch (error) {
      // Error handling is already done in controller
      console.error('Failed to load chart data:', error)
    }
  }
}
```

### Implementing a New Repository

```typescript
// 1. Define interface in domain/repositories/
export interface NewRepository {
  getData(): Promise<Data[]>
}

// 2. Implement in infrastructure/repositories/
export class ApiNewRepository implements NewRepository {
  async getData(): Promise<Data[]> {
    return await this.apiClient.get('/new-data')
  }
}

// 3. Register in DI container
container.register('newRepository', new ApiNewRepository(apiClient))
```

## Benefits

1. **Testability**: Easy to mock dependencies and test business logic
2. **Maintainability**: Clear separation of concerns
3. **Flexibility**: Easy to swap implementations (e.g., change from REST to GraphQL)
4. **Independence**: Domain logic is framework-agnostic
5. **Scalability**: Well-organized code structure supports growth

## Migration Notes

- All existing components have been moved to `/presentation/`
- Import paths need to be updated to reflect new structure
- Dependency injection container provides access to configured instances
- New features should follow the established layer patterns

## Next Steps

1. Update import statements throughout the application
2. Gradually refactor existing services to use the new architecture
3. Implement proper API client in the DI container
4. Add comprehensive tests for each layer
5. Consider adding proper error handling and logging across layers
