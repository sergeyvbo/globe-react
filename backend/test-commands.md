# Test Commands

Этот файл содержит удобные команды для запуска различных типов тестов.

## Unit Tests
Запуск только unit тестов:
```bash
dotnet test --filter "Category=Unit" --verbosity normal
```

## Integration Tests
Запуск только integration тестов:
```bash
dotnet test --filter "Category=Integration" --verbosity normal
```

## All Tests
Запуск всех тестов:
```bash
dotnet test --verbosity normal
```

## Specific Test Class
Запуск тестов конкретного класса:
```bash
dotnet test --filter "FullyQualifiedName~AuthServiceTests" --verbosity normal
dotnet test --filter "FullyQualifiedName~AuthControllerTests" --verbosity normal
```

## Test Coverage
Запуск тестов с покрытием кода:
```bash
dotnet test --collect:"XPlat Code Coverage" --verbosity normal
```

## Continuous Testing
Запуск тестов в режиме наблюдения:
```bash
dotnet watch test --filter "Category=Unit"
```