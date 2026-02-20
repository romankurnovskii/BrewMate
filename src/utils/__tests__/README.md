# Test Suite Documentation

This directory contains unit tests for the Pantry utility functions.

## Test Structure

Tests are organized by module, mirroring the source code structure:

- `path.test.ts` - Tests for PATH environment variable utilities
- `cache.test.ts` - Tests for cache management functions
- `brew.test.ts` - Tests for brew command execution utilities
- `fetchData.test.ts` - Tests for HTTP/HTTPS data fetching

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test suite covers:

- ✅ PATH environment variable manipulation
- ✅ Cache save/load operations
- ✅ Cache expiration handling
- ✅ Brew command execution with proper PATH
- ✅ HTTP data fetching and JSON parsing
- ✅ Error handling and edge cases

## Best Practices

1. **Isolation**: Each test is independent and doesn't rely on shared state
2. **Mocking**: External dependencies (fs, https, child_process) are mocked
3. **Edge Cases**: Tests cover empty inputs, errors, and boundary conditions
4. **Cleanup**: Tests properly reset mocks and state between runs

## Adding New Tests

When adding new utility functions:

1. Create a corresponding test file in this directory
2. Follow the naming convention: `[module].test.ts`
3. Mock external dependencies
4. Test both success and error cases
5. Include edge cases and boundary conditions
