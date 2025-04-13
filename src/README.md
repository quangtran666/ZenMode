# ZenMode Development Guide

## Using Logger Utility

ZenMode includes a customizable logger utility for development and debugging. This utility allows you to:

1. Enable/disable all console logging
2. Control specific log levels (debug, info, warn, error)
3. Persist logger settings between sessions

### Basic Usage

Import the logger from the utils folder:

```typescript
import { logger } from '../utils/logger';
```

Use the logger instead of console methods:

```typescript
// Instead of console.log()
logger.log('This is a log message');

// Instead of console.info()
logger.info('This is an info message');

// Instead of console.debug()
logger.debug('This is a debug message');

// Instead of console.warn()
logger.warn('This is a warning message');

// Instead of console.error()
logger.error('This is an error message');
```

### Toggle Logging On/Off

You can quickly toggle all logging:

```typescript
// Toggle logging (returns the new state)
const isEnabled = await logger.toggle();
```

### Check Logger State

To get the current logger configuration:

```typescript
const loggerState = logger.getState();
console.log(loggerState.enabled); // Is logging enabled?
console.log(loggerState.enabledLevels.debug); // Is debug level enabled?
```

### Benefits

1. **Development Time Control**: Easily turn logs on/off from the options page
2. **Production Readiness**: Disable logs in production without removing code
3. **Performance**: Avoid unnecessary console output when not needed
4. **Granular Control**: Keep only error logs if needed

Users can access these settings from the Developer Settings section in the options page.

## Best Practices

1. Always use the logger instead of direct console methods
2. Use appropriate log levels:
   - `debug` - For detailed debugging information
   - `log/info` - For general information
   - `warn` - For warnings that don't stop functionality
   - `error` - For errors and exceptions

3. Include relevant context in log messages
4. Consider structuring complex log data as objects 