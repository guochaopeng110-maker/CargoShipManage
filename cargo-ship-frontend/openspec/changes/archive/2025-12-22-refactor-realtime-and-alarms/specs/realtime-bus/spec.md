# Spec: 全局实时数据总线

## ADDED Requirements

### Requirement: Real-time Data Subscription Lifecycle
The system MUST initiate real-time subscriptions for all 8 core system equipment items immediately after user authentication is successful. This subscription SHALL remain active throughout the user session regardless of route changes.

#### Scenario: Continuous Data Flow Across Pages
- **WHEN** the user navigates from the Dashboard to the "Propulsion System" page
- **THEN** the page SHALL immediately display existing real-time data, and no new subscription or unsubscription requests SHALL be sent.

### Requirement: Global Connection Status Consistency
The connection status indicator on the TopBar SHALL strictly reflect the underlying WebSocket connection quality and SHALL NOT be affected by the unmounting of local components.

#### Scenario: Physical Connection Error Feedback
- **WHEN** a WebSocket connection error or disconnection occurrs due to network issues
- **THEN** the TopBar indicator SHALL synchronously update to the "Disconnected" state.
