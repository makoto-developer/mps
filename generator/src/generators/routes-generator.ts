/**
 * Express Routes Generator
 * ASTからExpressルートを生成
 */

import { Application, Resource, Endpoint } from '../ast/types';

export class RoutesGenerator {
  generate(app: Application): Map<string, string> {
    const files = new Map<string, string>();

    for (const resource of app.resources) {
      const filename = `${resource.name.toLowerCase()}.routes.ts`;
      const content = this.generateResource(resource);
      files.set(filename, content);
    }

    // Generate main router index
    files.set('index.ts', this.generateIndexRouter(app.resources));

    return files;
  }

  private generateResource(resource: Resource): string {
    const lines: string[] = [];
    const controllerName = `${resource.name}Controller`;
    const controllerFile = resource.name.toLowerCase();

    // Imports
    lines.push("import { Router } from 'express';");
    lines.push(`import { ${controllerName} } from '../controllers/${controllerFile}.controller';`);

    // Check if auth middleware is needed
    const needsAuth = resource.endpoints.some(e => e.auth !== 'None');
    if (needsAuth) {
      lines.push("import { authMiddleware } from '../middleware/auth.middleware';");
    }

    // Check if admin middleware is needed
    const needsAdmin = resource.endpoints.some(e => e.auth === 'Admin');
    if (needsAdmin) {
      lines.push("import { adminMiddleware } from '../middleware/admin.middleware';");
    }

    lines.push('');

    // Router setup
    lines.push('const router = Router();');
    lines.push(`const controller = new ${controllerName}();`);
    lines.push('');

    // Routes
    for (const endpoint of resource.endpoints) {
      lines.push(this.generateRoute(endpoint, resource.basePath));
    }

    lines.push('');
    lines.push('export default router;');

    return lines.join('\n');
  }

  private generateRoute(endpoint: Endpoint, basePath: string): string {
    const method = endpoint.method.toLowerCase();
    const fullPath = `${basePath}${endpoint.path}`;
    const handlerName = this.generateHandlerName(endpoint);

    const middlewares: string[] = [];

    if (endpoint.auth === 'Required') {
      middlewares.push('authMiddleware');
    } else if (endpoint.auth === 'Admin') {
      middlewares.push('authMiddleware');
      middlewares.push('adminMiddleware');
    }

    const middlewareStr = middlewares.length > 0 ? ', ' + middlewares.join(', ') + ', ' : ', ';

    return `router.${method}('${fullPath}'${middlewareStr}controller.${handlerName});`;
  }

  private generateHandlerName(endpoint: Endpoint): string {
    // Convert path to handler name
    // e.g., POST /register -> register
    // e.g., GET /:id -> getById
    // e.g., POST /:id/join -> joinById

    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();

    // Remove leading slash
    let name = path.replace(/^\//, '');

    // Handle root path
    if (!name) {
      if (method === 'get') return 'list';
      if (method === 'post') return 'create';
      if (method === 'put') return 'update';
      if (method === 'delete') return 'delete';
      return method;
    }

    // Replace path parameters
    name = name.replace(/:(\w+)/g, 'By' + this.capitalize('$1'));

    // Replace slashes with underscores
    name = name.replace(/\//g, '_');

    // Prefix with method for ambiguous cases
    if (method === 'get' && !name.includes('By')) {
      name = 'get' + this.capitalize(name);
    } else if (method === 'post') {
      name = name || 'create';
    } else if (method === 'put') {
      name = 'update' + this.capitalize(name);
    } else if (method === 'delete') {
      name = 'delete' + this.capitalize(name);
    }

    // Camel case
    name = this.toCamelCase(name);

    return name;
  }

  private generateIndexRouter(resources: Resource[]): string {
    const lines: string[] = [];

    lines.push("import { Router } from 'express';");

    for (const resource of resources) {
      const routerName = `${resource.name.toLowerCase()}Router`;
      const fileName = `${resource.name.toLowerCase()}.routes`;
      lines.push(`import ${routerName} from './${fileName}';`);
    }

    lines.push('');
    lines.push('const router = Router();');
    lines.push('');

    for (const resource of resources) {
      const routerName = `${resource.name.toLowerCase()}Router`;
      lines.push(`router.use(${routerName});`);
    }

    lines.push('');
    lines.push('export default router;');

    return lines.join('\n');
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
