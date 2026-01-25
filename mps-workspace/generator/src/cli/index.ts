#!/usr/bin/env node

/**
 * CLI Tool
 * DSLファイルからコードを生成
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../parser/lexer';
import { Parser } from '../parser/parser';
import { PrismaGenerator } from '../generators/prisma-generator';
import { RoutesGenerator } from '../generators/routes-generator';
import { ControllersGenerator } from '../generators/controllers-generator';
import { MiddlewareGenerator } from '../generators/middleware-generator';

const program = new Command();

program
  .name('dsl-gen')
  .description('Drawing App DSL Code Generator')
  .version('0.1.0');

program
  .command('generate')
  .alias('gen')
  .description('Generate code from DSL file')
  .argument('<input>', 'Input DSL file path')
  .option('-o, --output <dir>', 'Output directory', './generated')
  .action(async (input: string, options: { output: string }) => {
    try {
      console.log('🚀 Starting code generation...');
      console.log(`📄 Input: ${input}`);
      console.log(`📁 Output: ${options.output}`);
      console.log('');

      // Read DSL file
      const dslContent = fs.readFileSync(input, 'utf-8');

      // Lexical analysis
      console.log('⚙️  Lexical analysis...');
      const lexer = new Lexer(dslContent);
      const tokens = lexer.tokenize();
      console.log(`   Generated ${tokens.length} tokens`);

      // Parsing
      console.log('⚙️  Parsing...');
      const parser = new Parser(tokens);
      const ast = parser.parse();
      console.log(`   Parsed application: ${ast.name}`);

      // Create output directories
      const outputDir = path.resolve(options.output);
      ensureDir(outputDir);
      ensureDir(path.join(outputDir, 'prisma'));
      ensureDir(path.join(outputDir, 'routes'));
      ensureDir(path.join(outputDir, 'controllers'));
      ensureDir(path.join(outputDir, 'middleware'));

      // Generate Prisma schema
      console.log('⚙️  Generating Prisma schema...');
      const prismaGen = new PrismaGenerator();
      const prismaSchema = prismaGen.generate(ast);
      fs.writeFileSync(
        path.join(outputDir, 'prisma', 'schema.prisma'),
        prismaSchema
      );
      console.log('   ✅ Generated prisma/schema.prisma');

      // Generate routes
      console.log('⚙️  Generating Express routes...');
      const routesGen = new RoutesGenerator();
      const routeFiles = routesGen.generate(ast);
      for (const [filename, content] of routeFiles) {
        fs.writeFileSync(
          path.join(outputDir, 'routes', filename),
          content
        );
        console.log(`   ✅ Generated routes/${filename}`);
      }

      // Generate controllers
      console.log('⚙️  Generating controllers...');
      const controllersGen = new ControllersGenerator();
      const controllerFiles = controllersGen.generate(ast);
      for (const [filename, content] of controllerFiles) {
        fs.writeFileSync(
          path.join(outputDir, 'controllers', filename),
          content
        );
        console.log(`   ✅ Generated controllers/${filename}`);
      }

      // Generate middleware
      console.log('⚙️  Generating middleware...');
      const middlewareGen = new MiddlewareGenerator();
      const middlewareFiles = middlewareGen.generate();
      for (const [filename, content] of middlewareFiles) {
        fs.writeFileSync(
          path.join(outputDir, 'middleware', filename),
          content
        );
        console.log(`   ✅ Generated middleware/${filename}`);
      }

      // Generate package.json
      console.log('⚙️  Generating package.json...');
      const packageJson = generatePackageJson(ast.name);
      fs.writeFileSync(
        path.join(outputDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );
      console.log('   ✅ Generated package.json');

      // Generate .env.example
      console.log('⚙️  Generating .env.example...');
      const envExample = generateEnvExample();
      fs.writeFileSync(
        path.join(outputDir, '.env.example'),
        envExample
      );
      console.log('   ✅ Generated .env.example');

      // Generate README
      console.log('⚙️  Generating README.md...');
      const readme = generateReadme(ast.name);
      fs.writeFileSync(
        path.join(outputDir, 'README.md'),
        readme
      );
      console.log('   ✅ Generated README.md');

      console.log('');
      console.log('✨ Code generation completed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log(`   1. cd ${options.output}`);
      console.log('   2. npm install');
      console.log('   3. cp .env.example .env');
      console.log('   4. Edit .env and set DATABASE_URL and JWT_SECRET');
      console.log('   5. npx prisma migrate dev');
      console.log('   6. npm run dev');

    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generatePackageJson(appName: string): Record<string, unknown> {
  return {
    name: appName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: `Generated backend for ${appName}`,
    main: 'dist/index.js',
    scripts: {
      dev: 'ts-node src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      'prisma:generate': 'prisma generate',
      'prisma:migrate': 'prisma migrate dev',
    },
    dependencies: {
      '@prisma/client': '^5.0.0',
      express: '^4.18.0',
      jsonwebtoken: '^9.0.0',
      bcrypt: '^5.1.0',
      cors: '^2.8.5',
      dotenv: '^16.0.0',
    },
    devDependencies: {
      '@types/express': '^4.17.0',
      '@types/node': '^20.0.0',
      '@types/jsonwebtoken': '^9.0.0',
      '@types/bcrypt': '^5.0.0',
      '@types/cors': '^2.8.0',
      prisma: '^5.0.0',
      'ts-node': '^10.9.0',
      typescript: '^5.0.0',
    },
  };
}

function generateEnvExample(): string {
  return `# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# JWT
JWT_SECRET="your-secret-key-here"

# Server
PORT=3000
NODE_ENV=development
`;
}

function generateReadme(appName: string): string {
  return `# ${appName} - Generated Backend

This project was generated by Drawing App DSL.

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Setup environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env and set your database URL and JWT secret
\`\`\`

3. Run database migrations:
\`\`\`bash
npx prisma migrate dev
\`\`\`

4. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## Project Structure

\`\`\`
.
├── prisma/
│   └── schema.prisma      # Database schema
├── routes/
│   └── *.routes.ts        # API routes
├── controllers/
│   └── *.controller.ts    # Request handlers
├── middleware/
│   ├── auth.middleware.ts # Authentication
│   └── admin.middleware.ts # Authorization
└── package.json
\`\`\`

## API Endpoints

Generated API endpoints are defined in the \`routes/\` directory.

## Database

This project uses Prisma ORM with PostgreSQL.

- Schema: \`prisma/schema.prisma\`
- Migrations: \`npx prisma migrate dev\`
- Studio: \`npx prisma studio\`

## Development

- Development server: \`npm run dev\`
- Build: \`npm run build\`
- Production: \`npm start\`
`;
}
