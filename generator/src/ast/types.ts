/**
 * AST型定義
 * DSLの構造を表現する型定義
 */

// ============================================================
// Base Types
// ============================================================

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface ASTNode {
  type: string;
  loc?: SourceLocation;
}

// ============================================================
// Application
// ============================================================

export interface Application extends ASTNode {
  type: 'Application';
  name: string;
  database: string;
  port: number;
  models: Model[];
  resources: Resource[];
  rules: BusinessRule[];
  config?: Config;
}

// ============================================================
// Model
// ============================================================

export interface Model extends ASTNode {
  type: 'Model';
  name: string;
  fields: Field[];
  relationships: Relationship[];
}

export type FieldType =
  | 'String'
  | 'Integer'
  | 'Boolean'
  | 'DateTime'
  | 'UUID'
  | 'JSON'
  | 'Float'
  | 'Hash'
  | { Enum: string[] };

export interface Field extends ASTNode {
  type: 'Field';
  name: string;
  fieldType: FieldType;
  constraints: FieldConstraint[];
}

export interface FieldConstraint {
  type: ConstraintType;
  value?: string | number | boolean;
}

export type ConstraintType =
  | 'required'
  | 'unique'
  | 'primary'
  | 'auto'
  | 'default'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'email'
  | 'format';

export type RelationType =
  | 'OneToOne'
  | 'OneToMany'
  | 'ManyToOne'
  | 'ManyToMany';

export interface Relationship extends ASTNode {
  type: 'Relationship';
  name: string;
  relationType: RelationType;
  targetModel: string;
  isArray: boolean;
  isOptional: boolean;
}

// ============================================================
// Resource (API)
// ============================================================

export interface Resource extends ASTNode {
  type: 'Resource';
  name: string;
  basePath: string;
  endpoints: Endpoint[];
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface Endpoint extends ASTNode {
  type: 'Endpoint';
  method: HttpMethod;
  path: string;
  auth: AuthRequirement;
  requestFields: RequestField[];
  responseFields: ResponseField[];
}

export type AuthRequirement = 'None' | 'Required' | 'Admin' | 'Custom';

export interface RequestField extends ASTNode {
  type: 'RequestField';
  name: string;
  fieldType: FieldType;
  isRequired: boolean;
  constraints: FieldConstraint[];
}

export interface ResponseField extends ASTNode {
  type: 'ResponseField';
  name: string;
  fieldType: FieldType | string; // string for model references
  isArray: boolean;
  excludeFields?: string[];
  includeFields?: string[];
}

// ============================================================
// Business Rules
// ============================================================

export interface BusinessRule extends ASTNode {
  type: 'BusinessRule';
  name: string;
  trigger: Trigger;
  condition?: Condition;
  actions: Action[];
}

export interface Trigger extends ASTNode {
  type: 'Trigger';
  event: TriggerEvent;
  target?: string; // Model name or endpoint path
}

export type TriggerEvent =
  | 'OnCreate'
  | 'OnUpdate'
  | 'OnDelete'
  | 'OnRequest';

export interface Condition extends ASTNode {
  type: 'Condition';
  expression: Expression;
}

export type Expression =
  | ComparisonExpression
  | LogicalExpression
  | CountExpression
  | ExistsExpression;

export interface ComparisonExpression extends ASTNode {
  type: 'ComparisonExpression';
  left: string; // e.g., "Room.status"
  operator: ComparisonOperator;
  right: string | number | boolean;
}

export type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | '>=';

export interface LogicalExpression extends ASTNode {
  type: 'LogicalExpression';
  operator: 'AND' | 'OR';
  left: Expression;
  right: Expression;
}

export interface CountExpression extends ASTNode {
  type: 'CountExpression';
  target: string; // e.g., "Room.participants"
  operator: ComparisonOperator;
  value: number;
}

export interface ExistsExpression extends ASTNode {
  type: 'ExistsExpression';
  target: string;
  condition?: Expression;
}

export interface Action extends ASTNode {
  type: 'Action';
  actionType: ActionType;
  target?: string; // Model name
  parameters?: Record<string, string | number | boolean>;
}

export type ActionType =
  | 'Update'
  | 'Create'
  | 'Delete'
  | 'Return'
  | 'Set'
  | 'Grant'
  | 'Deny'
  | 'Notify';

// ============================================================
// Config
// ============================================================

export interface Config extends ASTNode {
  type: 'Config';
  jwt?: JWTConfig;
  cors?: CORSConfig;
  rateLimit?: RateLimitConfig;
  upload?: UploadConfig;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

export interface CORSConfig {
  origins: string[];
  methods: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface UploadConfig {
  maxSize: number;
  allowedTypes: string[];
}

// ============================================================
// Utility Types
// ============================================================

export type ASTNodeType =
  | Application
  | Model
  | Field
  | Relationship
  | Resource
  | Endpoint
  | RequestField
  | ResponseField
  | BusinessRule
  | Trigger
  | Condition
  | Action
  | Config;
