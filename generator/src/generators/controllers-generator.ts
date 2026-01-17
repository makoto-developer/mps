/**
 * Controllers Generator
 * ASTからExpressコントローラーを生成
 */

import { Application, Resource, Endpoint } from '../ast/types';

export class ControllersGenerator {
  generate(app: Application): Map<string, string> {
    const files = new Map<string, string>();

    for (const resource of app.resources) {
      const filename = `${resource.name.toLowerCase()}.controller.ts`;
      const content = this.generateController(resource);
      files.set(filename, content);
    }

    return files;
  }

  private generateController(resource: Resource): string {
    const lines: string[] = [];
    const controllerName = `${resource.name}Controller`;

    // Imports
    lines.push("import { Request, Response } from 'express';");
    lines.push("import { PrismaClient } from '@prisma/client';");
    lines.push('');
    lines.push('const prisma = new PrismaClient();');
    lines.push('');

    // Controller class
    lines.push(`export class ${controllerName} {`);

    for (const endpoint of resource.endpoints) {
      lines.push(this.generateHandler(endpoint, resource));
      lines.push('');
    }

    lines.push('}');

    return lines.join('\n');
  }

  private generateHandler(endpoint: Endpoint, resource: Resource): string {
    const lines: string[] = [];
    const handlerName = this.generateHandlerName(endpoint);

    lines.push(`  async ${handlerName}(req: Request, res: Response): Promise<void> {`);
    lines.push('    try {');

    // Generate handler body based on method
    lines.push(this.generateHandlerBody(endpoint, resource));

    lines.push('    } catch (error) {');
    lines.push('      console.error(error);');
    lines.push("      res.status(500).json({ error: 'Internal server error' });");
    lines.push('    }');
    lines.push('  }');

    return lines.join('\n');
  }

  private generateHandlerBody(endpoint: Endpoint, resource: Resource): string {
    const method = endpoint.method;
    const path = endpoint.path;

    // Guess the model name from resource name
    const modelName = resource.name.replace(/s$/, ''); // Remove trailing 's'
    const modelVar = modelName.toLowerCase();

    if (method === 'GET' && path === '/') {
      // List all
      return `
      const items = await prisma.${modelVar}.findMany();
      res.json({ ${modelVar}s: items });`;
    } else if (method === 'GET' && path.includes(':id')) {
      // Get by ID
      return `
      const { id } = req.params;
      const item = await prisma.${modelVar}.findUnique({ where: { id } });
      if (!item) {
        res.status(404).json({ error: '${modelName} not found' });
        return;
      }
      res.json({ ${modelVar}: item });`;
    } else if (method === 'POST' && path === '/') {
      // Create
      const fields = endpoint.requestFields.map(f => f.name).join(', ');
      return `
      const { ${fields} } = req.body;
      const item = await prisma.${modelVar}.create({
        data: { ${fields} }
      });
      res.status(201).json({ ${modelVar}: item });`;
    } else if (method === 'PUT' && path.includes(':id')) {
      // Update
      const fields = endpoint.requestFields.map(f => f.name).join(', ');
      return `
      const { id } = req.params;
      const { ${fields} } = req.body;
      const item = await prisma.${modelVar}.update({
        where: { id },
        data: { ${fields} }
      });
      res.json({ ${modelVar}: item });`;
    } else if (method === 'DELETE' && path.includes(':id')) {
      // Delete
      return `
      const { id } = req.params;
      await prisma.${modelVar}.delete({ where: { id } });
      res.json({ success: true });`;
    } else {
      // Generic handler
      return `
      // TODO: Implement ${endpoint.method} ${path}
      res.json({ message: 'Not implemented' });`;
    }
  }

  private generateHandlerName(endpoint: Endpoint): string {
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();

    let name = path.replace(/^\//, '');

    if (!name) {
      if (method === 'get') return 'list';
      if (method === 'post') return 'create';
      if (method === 'put') return 'update';
      if (method === 'delete') return 'delete';
      return method;
    }

    name = name.replace(/:(\w+)/g, 'By' + this.capitalize('$1'));
    name = name.replace(/\//g, '_');

    if (method === 'get' && !name.includes('By')) {
      name = 'get' + this.capitalize(name);
    } else if (method === 'post') {
      name = name || 'create';
    } else if (method === 'put') {
      name = 'update' + this.capitalize(name);
    } else if (method === 'delete') {
      name = 'delete' + this.capitalize(name);
    }

    name = this.toCamelCase(name);

    return name;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
