/** Just enough of Node's built-in SQLite for the tests (no @types/node in this project). */
declare module 'node:sqlite' {
  interface StatementSync {
    run(...values: unknown[]): unknown;
    all(...values: unknown[]): unknown[];
    get(...values: unknown[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): StatementSync;
  }
}
