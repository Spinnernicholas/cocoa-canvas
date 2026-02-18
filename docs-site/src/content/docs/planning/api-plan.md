---
title: Cocoa Canvas - API Plan
---

# Cocoa Canvas - API Plan

## Overview

Cocoa Canvas API is a RESTful Next.js API built on Next.js App Router (`app/api/` directory). All endpoints support JSON request/response bodies and follow standard HTTP conventions.

**NOTE**: This is the complete API design. See **PHASE_PLAN.md** for which endpoints are implemented in each phase:
- **Phase 1**: Auth only
- **Phase 2**: Voters + Imports
- **Phase 3**: Geocoding
- **Phase 4 (MVP)**: Map + Households

**Design Principles**:
- **Audit logging**: Sensitive operations logged automatically
- **Pagination**: Large datasets paginated (default 100, max 1000)
- **Error handling**: Consistent error response format
- **API versioning**: `/api/v1/` prefix (future-proof)
- **Rate limiting**: Prevent abuse, especially on sensitive endpoints

---

## API Architecture

### Base URL
```
Development:  http://localhost:3000/api/v1
Production:   https://cocoa-canvas.example.com/api/v1
```

### Authentication

All endpoints except `/auth/login` and `/auth/signup` require:
```
Authorization: Bearer <JWT_TOKEN>
```

JWT token obtained from `/auth/login` endpoint, valid for 30 minutes.

Refresh tokens rotated automatically; new token issued with each request.

### Response Format

**Success (2xx)**:
```json
{
  "success": true,
  "data": { /* endpoint-specific */ },
  "meta": {
    "timestamp": "2025-02-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

**Error (4xx, 5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      { "field": "email", "message": "Must be valid email" }
    ]
  },
  "meta": {
    "timestamp": "2025-02-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Error Codes

```
VALIDATION_ERROR      - Input validation failed
UNAUTHORIZED          - No valid authentication token
FORBIDDEN             - User lacks required permission
NOT_FOUND             - Resource not found
CONFLICT              - Resource already exists (duplicate)
RATE_LIMITED          - Too many requests
INTERNAL_ERROR        - Server error
```

---

## API Endpoints by Phase

### PHASE 1: Authentication Endpoints

#### POST /auth/login
Login with email/password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "roles": ["canvasser"]
    },
    "token": "eyJhbGc...",
    "expiresIn": 1800,
    "mfaRequired": false
  }
}
```

**Errors**: 401 (invalid credentials), 429 (too many attempts)

---

### POST /auth/mfa/verify
Verify MFA code for 2FA-enabled accounts.

**Request**:
```json
{
  "email": "user@example.com",
  "mfaCode": "123456",
  "sessionToken": "temp-token-from-login"
}
```

**Response (200)**: Same as login

---

### POST /auth/signup
Create new user (if registration enabled).

**Request**:
```json
{
  "email": "newuser@example.com",
  "password": "secure_password",
  "name": "Jane Smith",
  "organizationCode": "cc-org"  // Optional: join existing org
}
```

**Response (201)**: User object + token

---

### POST /auth/logout
Invalidate current session.

**Response (200)**:
```json
{
  "success": true,
  "data": { "message": "Logged out" }
}
```

---

### POST /auth/refresh
Refresh authentication token (auto-called by client).

**Response (200)**: New token

---

### PHASE 2: Voter Endpoints

#### GET /voters
List voters with filters and pagination.

**Query Parameters**:
```
?page=1&limit=100
?firstName=John&lastName=Smith
?address=123%20Main%20St
?precinct=01-12
?status=active
?partyAffiliation=D
?votingScoreMin=3&votingScoreMax=5
?assignedTo=user-123
?campaignId=campaign-456
?sortBy=lastName&sortOrder=asc
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "voters": [
      {
        "id": "voter-123",
        "firstName": "John",
        "lastName": "Smith",
        "address": "123 Main St",
        "city": "Pleasanton",
        "zip": "94588",
        "partyAffiliation": "D",
        "status": "active",
        "votingScore": 4,
        "precinct": "01-12",
        "geocoded": true,
        "latitude": 37.97,
        "longitude": -121.97,
        "lastContact": "2025-02-10T14:30:00Z",
        "assignment": {
          "campaignId": "campaign-456",
          "canvasserId": "user-789",
          "status": "assigned"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 100,
      "total": 5000,
      "pages": 50
    }
  }
}
```

**Permissions**: Canvasser sees only assigned voters; Manager sees team's voters; Admin sees all

---

### GET /voters/:id
Get single voter with full profile.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "voter-123",
    "firstName": "John",
    "lastName": "Smith",
    // ... basic fields
    
    // Detailed data (if user has permission)
    "phone": "555-1234",          // Masked if user is canvasser
    "email": "john@example.com",   // Masked if user is canvasser
    "dateOfBirth": "1980-01-15",   // Only admin
    
    // Household info
    "householdId": "household-456",
    "householdMembers": [
      { "id": "voter-222", "name": "Jane Smith", "partyAffiliation": "D" }
    ],
    
    // History
    "votingHistory": [
      { "electionDate": "2024-11-05", "electionType": "general", "voted": true },
      { "electionDate": "2024-03-05", "electionType": "primary", "voted": false }
    ],
    
    // Custom fields (enriched data)
    "customFields": {
      "engagement_score": 8,
      "volunteer_interest": true,
      "predicted_turnout": "high"
    },
    
    // Notes
    "notes": [
      {
        "id": "note-123",
        "content": "Interested in hosting event",
        "type": "interested",
        "createdBy": "manager-1",
        "createdAt": "2025-02-10T14:30:00Z"
      }
    ],
    
    // Assignments
    "assignments": [
      {
        "id": "assignment-123",
        "campaignId": "campaign-456",
        "canvasserId": "user-789",
        "status": "completed",
        "completedAt": "2025-02-11T10:00:00Z"
      }
    ]
  }
}
```

**Permissions**: Users see only data they're authorized to view

---

### PUT /voters/:id
Update voter record (admin/manager only).

**Request**:
```json
{
  "firstName": "Jonathan",
  "partyAffiliation": "I",
  "customFields": {
    "engagement_score": 9
  }
}
```

**Response (200)**: Updated voter object

**Audit**: Logs all field changes

---

### POST /voters/:id/notes
Add note to voter record.

**Request**:
```json
{
  "content": "Called, interested in volunteering",
  "type": "interested",
  "campaignId": "campaign-456"  // Optional
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "note-123",
    "content": "Called, interested in volunteering",
    "type": "interested",
    "createdAt": "2025-02-15T10:30:00Z",
    "createdBy": { "id": "user-789", "name": "Jane Manager" }
  }
}
```

---

### GET /voters/:id/history
Get voter's contact and voting history.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "votingHistory": [ /* election participation */ ],
    "contactHistory": [ /* all notes, assignments, responses */ ],
    "assignmentHistory": [ /* campaigns assigned to */ ]
  }
}
```

---

### POST /voters/bulk/assign
Bulk assign voters to canvassers.

**Request**:
```json
{
  "voterIds": ["voter-123", "voter-124", "voter-125"],
  "campaignId": "campaign-456",
  "canvasserId": "user-789",
  "priority": 1,
  "notes": "Priority contacts for event"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "assigned": 3,
    "failed": 0,
    "assignmentIds": ["assignment-1", "assignment-2", "assignment-3"]
  }
}
```

**Audit**: Logs bulk operation with job ID

---

### POST /voters/bulk/export
Export voter list (with audit log).

**Request**:
```json
{
  "voterIds": ["voter-123", "voter-124"],
  "fields": ["firstName", "lastName", "address", "phone"],
  "format": "csv"  // or "json"
}
```

**Response (200)**: CSV/JSON file download

**Audit**: Logs export with # of records, fields, user, timestamp

---

#### PHASE 1-2: Campaign Endpoints

**Phase 1**: Basic campaign create/view
**Phase 2**: Full campaign + survey integration

##### GET /campaigns
List campaigns.

**Query Parameters**:
```
?status=active&sortBy=startDate
?archived=false
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "campaign-456",
        "name": "2024 Fall Outreach",
        "description": "Multi-precinct canvassing campaign",
        "status": "active",
        "startDate": "2025-02-01",
        "endDate": "2025-03-31",
        "targetVoterCount": 5000,
        "assignedVoters": 3200,
        "completedVoters": 1500,
        "teams": [
          { "id": "team-1", "name": "Team A", "canvassersCount": 5 }
        ]
      }
    ]
  }
}
```

---

### POST /campaigns
Create new campaign.

**Request**:
```json
{
  "name": "Spring 2025 Get Out The Vote",
  "description": "GOTV push in key precincts",
  "startDate": "2025-03-01",
  "endDate": "2025-04-30",
  "targetAreas": ["01-12", "02-08"],  // Precinct IDs
  "teams": ["team-1", "team-2"]
}
```

**Response (201)**: Campaign object

---

### GET /campaigns/:id
Get campaign details with progress.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "campaign-456",
    "name": "2024 Fall Outreach",
    // ... base fields
    
    "surveys": [
      {
        "id": "survey-1",
        "name": "Voter Preference Survey",
        "status": "active",
        "questions": [
          {
            "id": "q1",
            "sequence": 1,
            "question": "Will you vote in the 2024 election?",
            "type": "yes_no",
            "required": true
          }
        ]
      }
    ],
    
    "progress": {
      "totalAssignments": 5000,
      "completedAssignments": 1500,
      "inProgressAssignments": 800,
      "percentComplete": 30,
      "byTeam": [
        { "teamId": "team-1", "assigned": 1000, "completed": 300 }
      ]
    },
    
    "assignments": [
      {
        "id": "assignment-123",
        "voterId": "voter-123",
        "canvasserId": "user-789",
        "status": "completed",
        "completedAt": "2025-02-11T10:00:00Z"
      }
    ]
  }
}
```

---

### PUT /campaigns/:id
Update campaign (manager/admin).

**Request**:
```json
{
  "status": "paused",
  "endDate": "2025-05-31"
}
```

**Response (200)**: Updated campaign

---

### PHASE 4 (MVP): Canvassing / Assignment Endpoints

#### GET /assignments
Get canvasser's assignments.

**Query Parameters**:
```
?status=assigned&campaignId=campaign-456
?sortBy=priority&includeCompleted=false
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assignment-123",
        "voter": {
          "id": "voter-123",
          "firstName": "John",
          "lastName": "Smith",
          "address": "123 Main St",
          "latitude": 37.97,
          "longitude": -121.97,
          "partyAffiliation": "D"
        },
        "campaign": {
          "id": "campaign-456",
          "name": "Spring Outreach"
        },
        "survey": {
          "id": "survey-1",
          "name": "Voter Preference"
        },
        "status": "assigned",
        "priority": 1,
        "notes": "VIP contact"
      }
    ]
  }
}
```

---

### POST /assignments/:id/start
Mark assignment as in-progress.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "assignment-123",
    "status": "in_progress",
    "startedAt": "2025-02-15T10:30:00Z"
  }
}
```

---

### POST /assignments/:id/complete
Submit canvassing response for assignment.

**Request**:
```json
{
  "contactOutcome": "contacted",
  "supportLevel": "lean_support",
  "surveyResponses": [
    {
      "questionId": "q1",
      "responseValue": "yes"
    },
    {
      "questionId": "q2",
      "responseValue": "lean_support"
    }
  ],
  "notes": "Very interested, asked about volunteering",
  "followupNeeded": true,
  "followupType": "phone"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "canvass-response-456",
    "assignmentId": "assignment-123",
    "status": "completed",
    "completedAt": "2025-02-15T10:45:00Z"
  }
}
```

---

### GET /campaigns/:id/survey
Get campaign survey questions and response stats.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "survey-1",
    "name": "Voter Preference Survey",
    "questions": [
      {
        "id": "q1",
        "question": "Will you vote in 2024?",
        "type": "yes_no",
        "totalResponses": 1500,
        "responses": {
          "yes": 1200,
          "no": 300
        }
      }
    ]
  }
}
```

---

### PHASE 4 (MVP): Map & Geographic Endpoints

#### GET /map/voters
Get voter points for map display (viewport-based).

**Query Parameters**:
```
?bounds=north,south,east,west
?zoom=13
?filters=votingScore:3-5,status:active,assignment:me
?maxResults=20000
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-121.97, 37.97]
        },
        "properties": {
          "id": "voter-123",
          "name": "John Smith",
          "partyAffiliation": "D",
          "votingScore": 4,
          "contactStatus": "not_contacted",
          "assignedTo": "user-789",
          "lastContact": "2025-02-10"
        }
      }
    ],
    "meta": {
      "displayed": 1523,
      "totalInBounds": 5000,
      "clustered": false
    }
  }
}
```

---

### GET /map/precincts
Get precinct boundaries and stats.

**Query Parameters**:
```
?bounds=north,south,east,west
?campaignId=campaign-456
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": [...] },
        "properties": {
          "id": "precinct-01-12",
          "name": "Precinct 01-12",
          "voterCount": 2500,
          "assignedCount": 1200,
          "completedCount": 500,
          "percentComplete": 20
        }
      }
    ]
  }
}
```

---

### GET /map/parcels
Get parcel boundaries (zoom >= 16 only).

**Query Parameters**:
```
?bounds=north,south,east,west
```

**Response (200)**: GeoJSON FeatureCollection of parcels

---

### PHASE 2-3: Data Import Endpoints

**Phase 2**: Voter file import
**Phase 3**: GeoJSON import + Geocoding

#### POST /imports/start
Initiate data import job.

**Request**:
```json
{
  "title": "Feb 2025 Contra Costa County Voter File",
  "dataType": "voter_file",
  "county": "Contra Costa",
  "mappingId": "mapping-cc-voters"  // Or upload mapping inline
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "status": "pending",
    "createdAt": "2025-02-15T10:30:00Z"
  }
}
```

---

### POST /imports/:jobId/upload
Upload file for import.

**Request**: Multipart form-data
```
file: <binary file>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "fileName": "voters.txt",
    "fileSize": 52428800,
    "fileHash": "abc123def456",
    "status": "validating"
  }
}
```

---

### POST /imports/:jobId/validate
Validate file format and preview data.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "status": "valid",
    "estimatedRecords": 150000,
    "preview": [
      { "voter_id": "V123456", "first_name": "John", "last_name": "Smith" }
    ],
    "issues": [],
    "warnings": ["5 records with missing ZIP codes"]
  }
}
```

---

### POST /imports/:jobId/execute
Execute the import job.

**Request**:
```json
{
  "action": "merge",  // or "replace", "append"
  "mergeStrategy": "update_existing"  // or "skip_existing"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "status": "processing",
    "estimatedTimeRemaining": 120  // seconds,
    "progressUrl": "/api/imports/import-job-123/progress"
  }
}
```

---

### GET /imports/:jobId/progress
Poll import progress (Server-Sent Events or polling).

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "status": "processing",
    "recordsProcessed": 50000,
    "recordsTotal": 150000,
    "percentComplete": 33,
    "eta": 120,
    "recordsInserted": 45000,
    "recordsUpdated": 5000,
    "recordsFailed": 0
  }
}
```

---

### GET /imports/:jobId/result
Get final import results and error log.

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "status": "completed",
    "completedAt": "2025-02-15T11:30:00Z",
    "statistics": {
      "recordsProcessed": 150000,
      "recordsInserted": 145000,
      "recordsUpdated": 5000,
      "recordsFailed": 0
    },
    "errors": [],
    "canRollback": true
  }
}
```

---

### POST /imports/:jobId/rollback
Undo an import (admin only).

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "jobId": "import-job-123",
    "status": "rolled_back",
    "recordsReverted": 150000
  }
}
```

---

### PHASE 2+: Admin & System Endpoints

#### GET /admin/users
List all users (admin only).

**Query Parameters**:
```
?page=1&limit=50
?role=canvasser
?active=true
```

**Response (200)**: Paginated user list

---

### POST /admin/users
Create new user (admin only).

**Request**:
```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "roles": ["canvasser"],
  "teams": ["team-1"],
  "sendInvite": true
}
```

**Response (201)**: User object

---

### PUT /admin/users/:id
Update user (admin only).

**Request**:
```json
{
  "roles": ["manager"],
  "teams": ["team-1", "team-2"],
  "isActive": true
}
```

**Response (200)**: Updated user

---

### GET /admin/audit-log
View audit log (admin/auditor).

**Query Parameters**:
```
?userId=user-123
?action=viewed_voter
?startDate=2025-02-01&endDate=2025-02-15
?limit=100
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-123",
        "action": "viewed_voter",
        "resource": "voter",
        "resourceId": "voter-123",
        "userId": "user-456",
        "userName": "Jane Manager",
        "ipAddress": "192.168.1.1",
        "createdAt": "2025-02-15T10:30:00Z"
      }
    ],
    "pagination": { "page": 1, "total": 500 }
  }
}
```

---

### GET /admin/stats
Get system statistics (admin only).

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "voters": {
      "total": 150000,
      "active": 145000,
      "geocoded": 142000
    },
    "campaigns": {
      "total": 5,
      "active": 2
    },
    "users": {
      "total": 25,
      "lastLogin": "2025-02-15T09:00:00Z"
    },
    "database": {
      "size": "2.5GB",
      "lastBackup": "2025-02-15T02:00:00Z"
    }
  }
}
```

---

## Rate Limiting

```
Default: 100 requests per minute per user
Sensitive endpoints: 10 requests per minute per user
  - /voters/:id/export
  - /admin/users
  - /imports/:jobId/execute

Backoff: 429 response with Retry-After header
```

---

## Pagination

All list endpoints support:
```
?page=1          (1-indexed)
?limit=100       (1-1000, default 100)
?offset=0        (Alternative to page)

Response includes:
{
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 5000,
    "pages": 50
  }
}
```

---

## Error Handling

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "password", "message": "Must be at least 8 characters" }
    ]
  }
}
```

### Permission Error (403)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this voter's phone number"
  }
}
```

### Rate Limited (429)
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 60 seconds"
  }
}
```

---

## Testing Strategy

### Unit Tests
```bash
# Test individual endpoint handlers
npm run test:api

# Example: POST /voters/:id/notes
describe('POST /voters/:id/notes', () => {
  it('should add note to voter', async () => {
    const response = await request(app)
      .post('/api/v1/voters/voter-123/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Test note' })
    expect(response.status).toBe(201)
  })
})
```

### Integration Tests
```bash
npm run test:integration

# Test full workflow: login → assign → canvass → export
```

### Load Testing
```bash
# Simulate 100 concurrent users on map endpoint
npm run test:load -- --users 100
```

---

## Implementation Phases

### Phase 1: Core API
```
✓ Authentication: /auth/login, /auth/logout, /auth/refresh
✓ Voters: GET /voters, GET /voters/:id, PUT /voters/:id
✓ Campaigns: GET /campaigns, POST /campaigns, GET /campaigns/:id
□ Assignments: GET /assignments, POST /assignments/:id/complete
```

### Phase 2: Canvassing
```
✓ Assignment lifecycle
✓ Canvass responses
✓ Survey management
```

### Phase 3: Data Management
```
□ Imports: upload, validate, execute, rollback
□ Admin endpoints
□ Audit logging
```

### Phase 4: Advanced
```
□ Real-time updates (WebSocket)
□ Export functionality
□ Analytics endpoints
```

---

## Next.js Implementation Notes

### File Structure
```
app/api/
├── v1/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── refresh/route.ts
│   ├── voters/
│   │   ├── route.ts              # GET /voters, POST (bulk)
│   │   ├── [id]/
│   │   │   ├── route.ts          # GET, PUT /voters/:id
│   │   │   ├── notes/route.ts    # POST /voters/:id/notes
│   │   │   └── history/route.ts
│   ├── campaigns/
│   ├── assignments/
│   ├── map/
│   ├── imports/
│   └── admin/
└── middleware.ts                  # Auth, logging, rate limiting
```

### Middleware Stack
```typescript
// middleware.ts
- Authentication verification
- Role-based access control
- Request logging
- Rate limiting
- Error handling
```

### Database Access
```typescript
// Each handler uses Prisma Client
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const voters = await prisma.voter.findMany({
    where: { status: 'active' },
    take: 100
  })
}
```

---

## References

- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [JSON:API Specification](https://jsonapi.org/) (reference for structure)
- [REST API Best Practices](https://restfulapi.net/)
