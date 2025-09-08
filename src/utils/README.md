# Socket Emitter Utility

This utility provides centralized functions for emitting socket events related to messages in the CRM system.

## Overview

The `socketEmitter.js` utility provides standardized functions for emitting socket events across the application. This ensures consistent socket event handling and reduces code duplication.

## Available Functions

### `emitLeadMessage`

Emits a message event for a specific lead.

```javascript
emitLeadMessage({ io, leadId, message, req })
```

**Parameters:**
- `io`: Socket.io instance (optional if using global instance)
- `leadId`: The lead ID
- `message`: The message object to emit
- `req`: Express request object (optional, used if io is not provided)

### `emitConversationUpdate`

Emits a conversation update event.

```javascript
emitConversationUpdate({ io, lead, req })
```

**Parameters:**
- `io`: Socket.io instance (optional if using global instance)
- `lead`: The lead object with messages
- `req`: Express request object (optional, used if io is not provided)

## Usage

```javascript
const { emitLeadMessage, emitConversationUpdate } = require('../utils/socketEmitter');

// Using with io instance
emitLeadMessage({ io, leadId: lead._id, message });

// Using with request object
emitLeadMessage({ req, leadId, message: newMessage });

// Using with lead object
emitConversationUpdate({ req, lead });
```

## Implementation Details

The utility automatically handles different ways of accessing the socket.io instance:

1. Directly provided `io` instance
2. From the Express `req` object
3. From the global socket service using `getIO()`

This flexibility ensures the utility can be used in various contexts throughout the application.