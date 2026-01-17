/**
 * Parser (構文解析器)
 * トークン列をASTに変換
 */

import { Token, TokenType } from './lexer';
import {
  Application,
  Model,
  Field,
  Relationship,
  Resource,
  Endpoint,
  BusinessRule,
  FieldType,
  FieldConstraint,
  ConstraintType,
  RelationType,
  HttpMethod,
  AuthRequirement,
  RequestField,
  ResponseField,
  Trigger,
  TriggerEvent,
  Condition,
  Action,
  ActionType,
  Config,
} from '../ast/types';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE && t.type !== TokenType.WHITESPACE);
  }

  private peek(offset: number = 0): Token {
    return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(
        `Expected ${type} but got ${token.type} at line ${token.line}, column ${token.column}`
      );
    }
    return this.advance();
  }

  private match(...types: TokenType[]): boolean {
    return types.includes(this.peek().type);
  }

  private consume(type: TokenType): boolean {
    if (this.match(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  // ============================================================
  // Main Parse Method
  // ============================================================

  public parse(): Application {
    this.expect(TokenType.APPLICATION);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    let database = 'PostgreSQL';
    let port = 3000;
    const models: Model[] = [];
    const resources: Resource[] = [];
    const rules: BusinessRule[] = [];
    let config: Config | undefined;

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.consume(TokenType.DATABASE)) {
        this.expect(TokenType.COLON);
        database = this.expect(TokenType.IDENTIFIER).value;
      } else if (this.consume(TokenType.PORT)) {
        this.expect(TokenType.COLON);
        port = parseInt(this.expect(TokenType.NUMBER).value, 10);
      } else if (this.match(TokenType.MODELS)) {
        models.push(...this.parseModels());
      } else if (this.match(TokenType.RESOURCES)) {
        resources.push(...this.parseResources());
      } else if (this.match(TokenType.RULES)) {
        rules.push(...this.parseRules());
      } else if (this.match(TokenType.CONFIG)) {
        config = this.parseConfig();
      } else {
        const token = this.advance();
        console.warn(`Unexpected token ${token.type} at line ${token.line}`);
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'Application',
      name,
      database,
      port,
      models,
      resources,
      rules,
      config,
    };
  }

  // ============================================================
  // Models
  // ============================================================

  private parseModels(): Model[] {
    this.expect(TokenType.MODELS);
    this.expect(TokenType.LBRACE);

    const models: Model[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      models.push(this.parseModel());
    }

    this.expect(TokenType.RBRACE);
    return models;
  }

  private parseModel(): Model {
    this.expect(TokenType.MODEL);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    const fields: Field[] = [];
    const relationships: Relationship[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.consume(TokenType.FIELDS)) {
        this.expect(TokenType.COLON);
        fields.push(...this.parseFields());
      } else if (this.consume(TokenType.RELATIONSHIPS)) {
        this.expect(TokenType.COLON);
        relationships.push(...this.parseRelationships());
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'Model',
      name,
      fields,
      relationships,
    };
  }

  private parseFields(): Field[] {
    const fields: Field[] = [];

    while (this.match(TokenType.HYPHEN)) {
      this.advance(); // Skip '-'
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);

      const fieldType = this.parseFieldType();
      const constraints = this.parseConstraints();

      fields.push({
        type: 'Field',
        name,
        fieldType,
        constraints,
      });
    }

    return fields;
  }

  private parseFieldType(): FieldType {
    const token = this.advance();

    if (token.type === TokenType.ENUM) {
      this.expect(TokenType.LPAREN);
      const values: string[] = [];

      while (!this.match(TokenType.RPAREN)) {
        values.push(this.expect(TokenType.IDENTIFIER).value);
        this.consume(TokenType.COMMA);
      }

      this.expect(TokenType.RPAREN);
      return { Enum: values };
    }

    const typeMap: Partial<Record<TokenType, FieldType>> = {
      [TokenType.STRING]: 'String',
      [TokenType.INTEGER]: 'Integer',
      [TokenType.BOOLEAN]: 'Boolean',
      [TokenType.DATETIME]: 'DateTime',
      [TokenType.UUID]: 'UUID',
      [TokenType.JSON]: 'JSON',
      [TokenType.FLOAT]: 'Float',
      [TokenType.HASH]: 'Hash',
    };

    if (token.type in typeMap && typeMap[token.type]) {
      return typeMap[token.type]!;
    }

    throw new Error(`Unknown field type: ${token.value} at line ${token.line}`);
  }

  private parseConstraints(): FieldConstraint[] {
    const constraints: FieldConstraint[] = [];

    while (this.match(
      TokenType.AT_REQUIRED,
      TokenType.AT_UNIQUE,
      TokenType.AT_PRIMARY,
      TokenType.AT_AUTO,
      TokenType.AT_DEFAULT,
      TokenType.AT_MIN,
      TokenType.AT_MAX,
      TokenType.AT_EMAIL
    )) {
      const token = this.advance();
      const constraintMap: Partial<Record<TokenType, ConstraintType>> = {
        [TokenType.AT_REQUIRED]: 'required',
        [TokenType.AT_UNIQUE]: 'unique',
        [TokenType.AT_PRIMARY]: 'primary',
        [TokenType.AT_AUTO]: 'auto',
        [TokenType.AT_EMAIL]: 'email',
      };

      const type = constraintMap[token.type];

      if (token.type === TokenType.AT_DEFAULT || token.type === TokenType.AT_MIN || token.type === TokenType.AT_MAX) {
        this.expect(TokenType.LPAREN);
        const valueToken = this.advance();
        let value: string | number | boolean;

        if (valueToken.type === TokenType.NUMBER) {
          value = parseFloat(valueToken.value);
        } else if (valueToken.type === TokenType.BOOLEAN_LITERAL) {
          value = valueToken.value === 'true';
        } else {
          value = valueToken.value;
        }

        this.expect(TokenType.RPAREN);

        const typeMap: Partial<Record<TokenType, ConstraintType>> = {
          [TokenType.AT_DEFAULT]: 'default',
          [TokenType.AT_MIN]: 'min',
          [TokenType.AT_MAX]: 'max',
        };

        const constraintType = typeMap[token.type];
        if (constraintType) {
          constraints.push({
            type: constraintType,
            value,
          });
        }
      } else if (type) {
        constraints.push({ type });
      }
    }

    return constraints;
  }

  private parseRelationships(): Relationship[] {
    const relationships: Relationship[] = [];

    while (this.match(TokenType.HYPHEN)) {
      this.advance(); // Skip '-'
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);

      const targetModel = this.expect(TokenType.IDENTIFIER).value;
      let isArray = false;
      let isOptional = false;

      // Check for array notation []
      if (this.consume(TokenType.LBRACKET)) {
        this.expect(TokenType.RBRACKET);
        isArray = true;
      }

      // Check for optional notation ?
      if (this.consume(TokenType.QUESTION)) {
        isOptional = true;
      }

      // Parse relationship type
      let relationType: RelationType = 'ManyToOne';
      if (this.match(
        TokenType.ONE_TO_ONE,
        TokenType.ONE_TO_MANY,
        TokenType.MANY_TO_ONE,
        TokenType.MANY_TO_MANY
      )) {
        const token = this.advance();
        const relationMap: Partial<Record<TokenType, RelationType>> = {
          [TokenType.ONE_TO_ONE]: 'OneToOne',
          [TokenType.ONE_TO_MANY]: 'OneToMany',
          [TokenType.MANY_TO_ONE]: 'ManyToOne',
          [TokenType.MANY_TO_MANY]: 'ManyToMany',
        };
        relationType = relationMap[token.type] || 'ManyToOne';
      }

      relationships.push({
        type: 'Relationship',
        name,
        relationType,
        targetModel,
        isArray,
        isOptional,
      });
    }

    return relationships;
  }

  // ============================================================
  // Resources (API)
  // ============================================================

  private parseResources(): Resource[] {
    this.expect(TokenType.RESOURCES);
    this.expect(TokenType.LBRACE);

    const resources: Resource[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      resources.push(this.parseResource());
    }

    this.expect(TokenType.RBRACE);
    return resources;
  }

  private parseResource(): Resource {
    this.expect(TokenType.RESOURCE);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    let basePath = `/api/${name.toLowerCase()}`;
    const endpoints: Endpoint[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.consume(TokenType.BASE_PATH)) {
        this.expect(TokenType.COLON);
        basePath = this.expect(TokenType.STRING_LITERAL).value;
      } else if (this.consume(TokenType.ENDPOINTS)) {
        this.expect(TokenType.COLON);
        endpoints.push(...this.parseEndpoints());
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'Resource',
      name,
      basePath,
      endpoints,
    };
  }

  private parseEndpoints(): Endpoint[] {
    const endpoints: Endpoint[] = [];

    while (this.match(TokenType.GET, TokenType.POST, TokenType.PUT, TokenType.DELETE, TokenType.PATCH)) {
      endpoints.push(this.parseEndpoint());
    }

    return endpoints;
  }

  private parseEndpoint(): Endpoint {
    const methodToken = this.advance();
    const methodMap: Partial<Record<TokenType, HttpMethod>> = {
      [TokenType.GET]: 'GET',
      [TokenType.POST]: 'POST',
      [TokenType.PUT]: 'PUT',
      [TokenType.DELETE]: 'DELETE',
      [TokenType.PATCH]: 'PATCH',
    };
    const method = methodMap[methodToken.type] || 'GET';

    const path = this.advance().value; // Can be IDENTIFIER or STRING_LITERAL

    let auth: AuthRequirement = 'None';
    if (this.match(TokenType.AT_REQUIRED)) {
      this.advance();
      auth = 'Required';
    }

    this.expect(TokenType.LBRACE);

    const requestFields: RequestField[] = [];
    const responseFields: ResponseField[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.consume(TokenType.AUTH)) {
        this.expect(TokenType.COLON);
        const authToken = this.advance();
        if (authToken.type === TokenType.NONE) auth = 'None';
        else if (authToken.type === TokenType.REQUIRED) auth = 'Required';
        else if (authToken.type === TokenType.ADMIN) auth = 'Admin';
      } else if (this.consume(TokenType.REQUEST)) {
        this.expect(TokenType.COLON);
        requestFields.push(...this.parseRequestFields());
      } else if (this.consume(TokenType.RESPONSE)) {
        this.expect(TokenType.COLON);
        responseFields.push(...this.parseResponseFields());
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'Endpoint',
      method,
      path,
      auth,
      requestFields,
      responseFields,
    };
  }

  private parseRequestFields(): RequestField[] {
    const fields: RequestField[] = [];

    while (this.match(TokenType.HYPHEN)) {
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);
      const fieldType = this.parseFieldType();
      const constraints = this.parseConstraints();
      const isRequired = constraints.some(c => c.type === 'required');

      fields.push({
        type: 'RequestField',
        name,
        fieldType,
        isRequired,
        constraints,
      });
    }

    return fields;
  }

  private parseResponseFields(): ResponseField[] {
    const fields: ResponseField[] = [];

    while (this.match(TokenType.HYPHEN)) {
      this.advance();
      const name = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);

      const typeToken = this.advance();
      let fieldType: FieldType | string = typeToken.value;
      let isArray = false;

      if (this.consume(TokenType.LBRACKET)) {
        this.expect(TokenType.RBRACKET);
        isArray = true;
      }

      fields.push({
        type: 'ResponseField',
        name,
        fieldType,
        isArray,
      });
    }

    return fields;
  }

  // ============================================================
  // Rules
  // ============================================================

  private parseRules(): BusinessRule[] {
    this.expect(TokenType.RULES);
    this.expect(TokenType.LBRACE);

    const rules: BusinessRule[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      rules.push(this.parseRule());
    }

    this.expect(TokenType.RBRACE);
    return rules;
  }

  private parseRule(): BusinessRule {
    this.expect(TokenType.RULE);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LBRACE);

    let trigger: Trigger | undefined;
    let condition: Condition | undefined;
    const actions: Action[] = [];

    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      if (this.consume(TokenType.TRIGGER)) {
        this.expect(TokenType.COLON);
        trigger = this.parseTrigger();
      } else if (this.consume(TokenType.CONDITION)) {
        this.expect(TokenType.COLON);
        condition = this.parseCondition();
      } else if (this.consume(TokenType.ACTIONS)) {
        this.expect(TokenType.COLON);
        actions.push(...this.parseActions());
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    if (!trigger) {
      throw new Error(`Rule ${name} must have a trigger`);
    }

    return {
      type: 'BusinessRule',
      name,
      trigger,
      condition,
      actions,
    };
  }

  private parseTrigger(): Trigger {
    const token = this.advance();
    const eventName = token.value;

    const eventMap: Record<string, TriggerEvent> = {
      'OnCreate': 'OnCreate',
      'OnUpdate': 'OnUpdate',
      'OnDelete': 'OnDelete',
      'OnRequest': 'OnRequest',
    };

    const event = eventMap[eventName] || 'OnCreate';

    let target: string | undefined;
    if (this.consume(TokenType.LPAREN)) {
      target = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.RPAREN);
    }

    return {
      type: 'Trigger',
      event,
      target,
    };
  }

  private parseCondition(): Condition {
    // Simplified condition parsing
    // For now, just consume tokens until we hit Actions or }
    const tokens: string[] = [];
    while (!this.match(TokenType.ACTIONS, TokenType.RBRACE, TokenType.EOF)) {
      tokens.push(this.advance().value);
    }

    return {
      type: 'Condition',
      expression: {
        type: 'ComparisonExpression',
        left: tokens.join(' '),
        operator: '==',
        right: true,
      },
    };
  }

  private parseActions(): Action[] {
    const actions: Action[] = [];

    while (this.match(TokenType.HYPHEN)) {
      this.advance();
      const actionTokens: string[] = [];

      while (!this.match(TokenType.HYPHEN, TokenType.RBRACE, TokenType.EOF)) {
        actionTokens.push(this.advance().value);
      }

      const actionText = actionTokens.join(' ');
      const actionType: ActionType = this.inferActionType(actionText);

      actions.push({
        type: 'Action',
        actionType,
        parameters: { description: actionText },
      });
    }

    return actions;
  }

  private inferActionType(text: string): ActionType {
    if (text.includes('Update') || text.includes('Set')) return 'Update';
    if (text.includes('Create')) return 'Create';
    if (text.includes('Delete')) return 'Delete';
    if (text.includes('Return')) return 'Return';
    if (text.includes('Grant')) return 'Grant';
    if (text.includes('Deny')) return 'Deny';
    if (text.includes('Notify')) return 'Notify';
    return 'Update';
  }

  // ============================================================
  // Config
  // ============================================================

  private parseConfig(): Config {
    this.expect(TokenType.CONFIG);
    this.expect(TokenType.LBRACE);

    // Simplified config parsing
    while (!this.match(TokenType.RBRACE) && !this.match(TokenType.EOF)) {
      this.advance();
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'Config',
    };
  }
}
