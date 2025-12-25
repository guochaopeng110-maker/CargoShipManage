# Spec: 告警中心历史查询优化

## ADDED Requirements

### Requirement: Dynamic Equipment Filtering
The equipment dropdown list for historical alarm queries MUST be dynamically loaded from the backend equipment management service.

#### Scenario: Fetching Latest Equipment List
- **WHEN** the operator opens the "Alarm Center" and clicks the equipment dropdown
- **THEN** the system SHALL request the equipment list and display all current 8 core systems.

### Requirement: Simplified Historical Query
Historical queries MUST focus on chronological tracing, removing UI filters for Status (Pending/Resolved) and Severity levels.

#### Scenario: Quick Fault Origin Tracing
- **WHEN** the operator selects a specific equipment and date range and executes the query
- **THEN** the request SHALL NOT carry severity or status parameters, and the backend SHALL return all raw records for that period.

### Requirement: Paginated Results Display
Historical alarm query results MUST support pagination, with the frontend UI controlling page requests.

#### Scenario: Page Jump Loading
- **WHEN** the user clicks "Page 2" in the query results
- **THEN** the system SHALL send a paginated request with `page=2` and update the results table.
