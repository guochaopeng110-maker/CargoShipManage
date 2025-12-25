# realtime-bus Specification

## MODIFIED Requirements
### Requirement: Real-time Data Subscription Lifecycle
The system MUST initiate real-time subscriptions for all 8 core system equipment items immediately after user authentication is successful. This subscription SHALL remain active throughout the user session regardless of route changes. Data indexing MUST use the device ID combined with the standard monitoring point name to ensure multi-point persistence.

#### Scenario: Continuous Data Flow Across Pages
- **WHEN** the user navigates from the Dashboard to the "Propulsion System" page
- **THEN** the page SHALL immediately display existing real-time data indexed by standard names, and no new subscription or unsubscription requests SHALL be sent.

## ADDED Requirements
### Requirement: Pervasive Data Integrity Mapping
All real-time data payloads MUST be transformed using a global mapper that injects standard business names and equipment metadata before reaching the store.

#### Scenario: Real-time Alarm Metadata Enrichment
- **WHEN** an `alarm:push` event is received without common name fields
- **THEN** the system SHALL automatically map the `equipmentId` to its registered `equipmentName` and the `abnormalMetricType` to its UI label before updating the alarms store.
