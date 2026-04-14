export const typeDefs = `#graphql
  scalar DateTime
  scalar JSON

  enum EntityType {
    PERSON
    COMPANY
    DOMAIN
    IP
    EMAIL
    USERNAME
    PHONE
    ADDRESS
    URL
    HASH
    CRYPTOCURRENCY
    SOCIAL_MEDIA
    DARKWEB
    BREACH
    VULNERABILITY
    CERTIFICATE
    ASN
    NETWORK
  }

  enum RelationType {
    OWNS
    WORKS_FOR
    CONTACT
    ASSOCIATED
    LOCATED_AT
    HOSTED_ON
    POINTS_TO
    SIMILAR
    FAMILY
    EMPLOYEE
    PARTNER
    SUPPLIER
    CUSTOMER
  }

  enum Severity {
    CRITICAL
    HIGH
    MEDIUM
    LOW
    INFO
  }

  enum ReportStatus {
    DRAFT
    PENDING
    COMPLETED
    FAILED
  }

  type Entity {
    id: ID!
    type: EntityType!
    value: String!
    name: String
    description: String
    confidence: Int!
    source: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    caseId: ID!
    relations: [Relation!]
    findings: [Finding!]
  }

  type Relation {
    id: ID!
    type: RelationType!
    fromEntity: Entity!
    toEntity: Entity!
    confidence: Int!
    evidence: String
    createdAt: DateTime!
  }

  type Case {
    id: ID!
    name: String!
    description: String
    status: String!
    priority: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    entities: [Entity!]!
    relations: [Relation!]!
    findings: [Finding!]!
    reports: [Report!]!
    monitors: [Monitor!]!
    tags: [String!]!
  }

  type Finding {
    id: ID!
    title: String!
    description: String!
    severity: Severity!
    confidence: Int!
    category: String!
    source: String!
    entities: [Entity!]!
    evidence: [Evidence!]!
    createdAt: DateTime!
    verified: Boolean!
  }

  type Evidence {
    id: ID!
    type: String!
    title: String!
    description: String
    url: String
    data: JSON
    hash: String
    capturedAt: DateTime!
    capturedBy: String!
  }

  type Report {
    id: ID!
    title: String!
    type: String!
    status: ReportStatus!
    content: JSON
    findings: [Finding!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    generatedBy: String!
    downloadUrl: String
  }

  type Monitor {
    id: ID!
    name: String!
    target: String!
    targetType: String!
    status: String!
    checkInterval: Int!
    lastCheck: DateTime
    nextCheck: DateTime
    alertCount: Int!
    createdAt: DateTime!
  }

  type Alert {
    id: ID!
    monitorId: ID!
    title: String!
    description: String!
    severity: Severity!
    status: String!
    createdAt: DateTime!
    acknowledgedAt: DateTime
    resolvedAt: DateTime
  }

  type ShodanResult {
    ip: String!
    ports: [Int!]!
    hostnames: [String!]!
    org: String
    os: String
    data: JSON
    vulns: [String!]
  }

  type CensysResult {
    ip: String!
    services: JSON
    location: JSON
    autonomousSystem: JSON
    operatingSystem: JSON
  }

  type DarkWebResult {
    id: ID!
    source: String!
    title: String!
    url: String
    content: String
    publishedAt: DateTime
    riskLevel: Severity!
    extractedData: JSON
  }

  type SocialProfile {
    id: ID!
    platform: String!
    username: String!
    displayName: String
    bio: String
    followers: Int
    following: Int
    posts: Int
    url: String
    location: String
    website: String
    emails: [String!]
    createdAt: DateTime
    lastActive: DateTime
  }

  type ScanResult {
    id: ID!
    target: String!
    targetType: String!
    status: String!
    progress: Int!
    findings: [Finding!]!
    startedAt: DateTime!
    completedAt: DateTime
    error: String
  }

  type SearchResult {
    entities: [Entity!]!
    relations: [Relation!]!
    findings: [Finding!]!
    totalCount: Int!
    query: String!
    executionTime: Int!
  }

  type Query {
    # Cases
    cases: [Case!]!
    case(id: ID!): Case
    activeCase: Case

    # Entities
    entities(caseId: ID, type: EntityType): [Entity!]!
    entity(id: ID!): Entity
    searchEntities(query: String!, filters: JSON): SearchResult!

    # Relations
    relations(caseId: ID!, entityId: ID): [Relation!]!
    relationGraph(caseId: ID!, depth: Int = 2): JSON!

    # Findings
    findings(caseId: ID, severity: Severity): [Finding!]!
    finding(id: ID!): Finding

    # Reports
    reports(caseId: ID): [Report!]!
    report(id: ID!): Report

    # Monitors & Alerts
    monitors: [Monitor!]!
    monitor(id: ID!): Monitor
    alerts(monitorId: ID, status: String): [Alert!]!

    # OSINT Sources
    shodanLookup(ip: String!): ShodanResult
    censysLookup(ip: String!): CensysResult
    darkwebSearch(query: String!, sources: [String!]): [DarkWebResult!]!
    socialProfile(platform: String!, username: String!): SocialProfile
    ctLogs(domain: String!): JSON
    passiveDns(query: String!): JSON
    whoisLookup(domain: String!): JSON

    # Dashboard Stats
    dashboardStats: JSON!
    osintStats(source: String, period: String): JSON!
  }

  input CreateEntityInput {
    type: EntityType!
    value: String!
    name: String
    description: String
    confidence: Int!
    source: String
    metadata: JSON
    caseId: ID!
  }

  input CreateRelationInput {
    type: RelationType!
    fromEntityId: ID!
    toEntityId: ID!
    confidence: Int!
    evidence: String
  }

  input CreateCaseInput {
    name: String!
    description: String
    priority: String
    tags: [String!]
  }

  input UpdateCaseInput {
    name: String
    description: String
    status: String
    priority: String
    tags: [String!]
  }

  input CreateMonitorInput {
    name: String!
    target: String!
    targetType: String!
    checkInterval: Int!
    alertConditions: JSON
  }

  input ScanRequestInput {
    target: String!
    targetType: String!
    modules: [String!]!
    depth: String
    options: JSON
  }

  type Mutation {
    # Cases
    createCase(input: CreateCaseInput!): Case!
    updateCase(id: ID!, input: UpdateCaseInput!): Case!
    deleteCase(id: ID!): Boolean!
    setActiveCase(id: ID!): Case!

    # Entities
    createEntity(input: CreateEntityInput!): Entity!
    updateEntity(id: ID!, confidence: Int, metadata: JSON): Entity!
    deleteEntity(id: ID!): Boolean!
    mergeEntities(ids: [ID!]!, targetId: ID!): Entity!

    # Relations
    createRelation(input: CreateRelationInput!): Relation!
    deleteRelation(id: ID!): Boolean!

    # Findings
    createFinding(title: String!, description: String!, severity: Severity!, category: String!, source: String!, caseId: ID!, entityIds: [ID!]): Finding!
    updateFinding(id: ID!, verified: Boolean!): Finding!
    deleteFinding(id: ID!): Boolean!

    # Reports
    generateReport(caseId: ID!, template: String!, sections: [String!], options: JSON): Report!
    deleteReport(id: ID!): Boolean!

    # Monitors
    createMonitor(input: CreateMonitorInput!): Monitor!
    toggleMonitor(id: ID!): Monitor!
    deleteMonitor(id: ID!): Boolean!
    acknowledgeAlert(id: ID!): Alert!
    resolveAlert(id: ID!): Alert!

    # OSINT Scans
    startScan(input: ScanRequestInput!): ScanResult!
    cancelScan(id: ID!): Boolean!

    # Import/Export
    importCase(data: JSON!): Case!
    exportCase(id: ID!): JSON!
    importEntities(caseId: ID!, data: JSON!): [Entity!]!
  }

  type Subscription {
    # Real-time updates
    scanProgress(scanId: ID!): ScanResult!
    newAlert: Alert!
    monitorStatus(monitorId: ID!): Monitor!
    caseUpdated(caseId: ID!): Case!
    entityCreated(caseId: ID!): Entity!
    findingCreated(caseId: ID!): Finding!

    # Live monitoring
    liveShodan(query: String!): ShodanResult!
    liveSocialMentions(query: String!): SocialProfile!
  }
`;
