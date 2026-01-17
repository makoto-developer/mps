/**
 * Lexer (字句解析器)
 * DSLテキストをトークンに分割
 */

export enum TokenType {
  // Keywords
  APPLICATION = 'APPLICATION',
  DATABASE = 'DATABASE',
  PORT = 'PORT',
  MODELS = 'MODELS',
  MODEL = 'MODEL',
  FIELDS = 'FIELDS',
  RELATIONSHIPS = 'RELATIONSHIPS',
  RESOURCES = 'RESOURCES',
  RESOURCE = 'RESOURCE',
  BASE_PATH = 'BASE_PATH',
  ENDPOINTS = 'ENDPOINTS',
  AUTH = 'AUTH',
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
  RULES = 'RULES',
  RULE = 'RULE',
  TRIGGER = 'TRIGGER',
  CONDITION = 'CONDITION',
  ACTIONS = 'ACTIONS',
  CONFIG = 'CONFIG',

  // HTTP Methods
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',

  // Types
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  DATETIME = 'DATETIME',
  UUID = 'UUID',
  JSON = 'JSON',
  FLOAT = 'FLOAT',
  HASH = 'HASH',
  ENUM = 'ENUM',

  // Relationships
  ONE_TO_ONE = 'ONE_TO_ONE',
  ONE_TO_MANY = 'ONE_TO_MANY',
  MANY_TO_ONE = 'MANY_TO_ONE',
  MANY_TO_MANY = 'MANY_TO_MANY',

  // Auth
  NONE = 'NONE',
  REQUIRED = 'REQUIRED',
  ADMIN = 'ADMIN',

  // Constraints
  AT_REQUIRED = '@required',
  AT_UNIQUE = '@unique',
  AT_PRIMARY = '@primary',
  AT_AUTO = '@auto',
  AT_DEFAULT = '@default',
  AT_MIN = '@min',
  AT_MAX = '@max',
  AT_EMAIL = '@email',
  AT_EXCLUDE = '@exclude',
  AT_INCLUDE = '@include',

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING_LITERAL = 'STRING_LITERAL',
  BOOLEAN_LITERAL = 'BOOLEAN_LITERAL',

  // Symbols
  COLON = ':',
  COMMA = ',',
  DOT = '.',
  HYPHEN = '-',
  LBRACE = '{',
  RBRACE = '}',
  LPAREN = '(',
  RPAREN = ')',
  LBRACKET = '[',
  RBRACKET = ']',
  QUESTION = '?',
  ARROW = '->',

  // Operators
  EQUALS = '==',
  NOT_EQUALS = '!=',
  LESS_THAN = '<',
  GREATER_THAN = '>',
  LESS_EQUAL = '<=',
  GREATER_EQUAL = '>=',
  AND = 'AND',
  OR = 'OR',

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
  WHITESPACE = 'WHITESPACE',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private advance(): void {
    if (this.input[this.pos] === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.pos++;
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] || '';
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '/' && this.peek(1) === '/') {
        // Skip line comments
        while (this.peek() !== '\n' && this.pos < this.input.length) {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private readString(): string {
    const quote = this.peek();
    this.advance(); // Skip opening quote

    let value = '';
    while (this.pos < this.input.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.advance();
        const escapeChar = this.peek();
        switch (escapeChar) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escapeChar;
        }
        this.advance();
      } else {
        value += this.peek();
        this.advance();
      }
    }

    this.advance(); // Skip closing quote
    return value;
  }

  private readNumber(): string {
    let value = '';
    while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
      value += this.peek();
      this.advance();
    }
    return value;
  }

  private readIdentifier(): string {
    let value = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
      value += this.peek();
      this.advance();
    }
    return value;
  }

  private keywordOrIdentifier(value: string): TokenType {
    const keywords: Record<string, TokenType> = {
      'Application': TokenType.APPLICATION,
      'Database': TokenType.DATABASE,
      'Port': TokenType.PORT,
      'Models': TokenType.MODELS,
      'Model': TokenType.MODEL,
      'Fields': TokenType.FIELDS,
      'Relationships': TokenType.RELATIONSHIPS,
      'Resources': TokenType.RESOURCES,
      'Resource': TokenType.RESOURCE,
      'BasePath': TokenType.BASE_PATH,
      'Endpoints': TokenType.ENDPOINTS,
      'Auth': TokenType.AUTH,
      'Request': TokenType.REQUEST,
      'Response': TokenType.RESPONSE,
      'Rules': TokenType.RULES,
      'Rule': TokenType.RULE,
      'Trigger': TokenType.TRIGGER,
      'Condition': TokenType.CONDITION,
      'Actions': TokenType.ACTIONS,
      'Config': TokenType.CONFIG,
      'GET': TokenType.GET,
      'POST': TokenType.POST,
      'PUT': TokenType.PUT,
      'DELETE': TokenType.DELETE,
      'PATCH': TokenType.PATCH,
      'String': TokenType.STRING,
      'Integer': TokenType.INTEGER,
      'Boolean': TokenType.BOOLEAN,
      'DateTime': TokenType.DATETIME,
      'UUID': TokenType.UUID,
      'JSON': TokenType.JSON,
      'Float': TokenType.FLOAT,
      'Hash': TokenType.HASH,
      'Enum': TokenType.ENUM,
      'OneToOne': TokenType.ONE_TO_ONE,
      'OneToMany': TokenType.ONE_TO_MANY,
      'ManyToOne': TokenType.MANY_TO_ONE,
      'ManyToMany': TokenType.MANY_TO_MANY,
      'None': TokenType.NONE,
      'Required': TokenType.REQUIRED,
      'Admin': TokenType.ADMIN,
      'AND': TokenType.AND,
      'OR': TokenType.OR,
      'true': TokenType.BOOLEAN_LITERAL,
      'false': TokenType.BOOLEAN_LITERAL,
    };

    return keywords[value] || TokenType.IDENTIFIER;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      this.skipWhitespace();

      if (this.pos >= this.input.length) {
        break;
      }

      const line = this.line;
      const column = this.column;
      const char = this.peek();

      // String literals
      if (char === '"' || char === "'") {
        const value = this.readString();
        tokens.push({ type: TokenType.STRING_LITERAL, value, line, column });
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char)) {
        const value = this.readNumber();
        tokens.push({ type: TokenType.NUMBER, value, line, column });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_]/.test(char)) {
        const value = this.readIdentifier();
        const type = this.keywordOrIdentifier(value);
        tokens.push({ type, value, line, column });
        continue;
      }

      // Constraints
      if (char === '@') {
        this.advance();
        const name = this.readIdentifier();
        const constraintMap: Record<string, TokenType> = {
          'required': TokenType.AT_REQUIRED,
          'unique': TokenType.AT_UNIQUE,
          'primary': TokenType.AT_PRIMARY,
          'auto': TokenType.AT_AUTO,
          'default': TokenType.AT_DEFAULT,
          'min': TokenType.AT_MIN,
          'max': TokenType.AT_MAX,
          'email': TokenType.AT_EMAIL,
          'exclude': TokenType.AT_EXCLUDE,
          'include': TokenType.AT_INCLUDE,
        };
        const type = constraintMap[name] || TokenType.IDENTIFIER;
        tokens.push({ type, value: `@${name}`, line, column });
        continue;
      }

      // Two-character operators
      if (char === '=' && this.peek(1) === '=') {
        tokens.push({ type: TokenType.EQUALS, value: '==', line, column });
        this.advance();
        this.advance();
        continue;
      }

      if (char === '!' && this.peek(1) === '=') {
        tokens.push({ type: TokenType.NOT_EQUALS, value: '!=', line, column });
        this.advance();
        this.advance();
        continue;
      }

      if (char === '<' && this.peek(1) === '=') {
        tokens.push({ type: TokenType.LESS_EQUAL, value: '<=', line, column });
        this.advance();
        this.advance();
        continue;
      }

      if (char === '>' && this.peek(1) === '=') {
        tokens.push({ type: TokenType.GREATER_EQUAL, value: '>=', line, column });
        this.advance();
        this.advance();
        continue;
      }

      if (char === '-' && this.peek(1) === '>') {
        tokens.push({ type: TokenType.ARROW, value: '->', line, column });
        this.advance();
        this.advance();
        continue;
      }

      // Single-character tokens
      const singleChar: Record<string, TokenType> = {
        ':': TokenType.COLON,
        ',': TokenType.COMMA,
        '.': TokenType.DOT,
        '-': TokenType.HYPHEN,
        '{': TokenType.LBRACE,
        '}': TokenType.RBRACE,
        '(': TokenType.LPAREN,
        ')': TokenType.RPAREN,
        '[': TokenType.LBRACKET,
        ']': TokenType.RBRACKET,
        '?': TokenType.QUESTION,
        '<': TokenType.LESS_THAN,
        '>': TokenType.GREATER_THAN,
        '\n': TokenType.NEWLINE,
      };

      if (singleChar[char]) {
        tokens.push({ type: singleChar[char], value: char, line, column });
        this.advance();
        continue;
      }

      throw new Error(`Unexpected character '${char}' at line ${line}, column ${column}`);
    }

    tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column });
    return tokens;
  }
}
