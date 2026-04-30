export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type DeepNonNullable<T> = {
  [P in keyof T]-?: T[P] extends null | undefined ? never : T[P];
};

export type PickRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Exactly<T, X> = T extends X ? (X extends T ? X : never) : never;

export type StringKeyOf<T> = Extract<keyof T, string>;

export type NumberKeyOf<T> = Extract<keyof T, number>;

export type FunctionType = (...args: unknown[]) => unknown;

export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

export type ConstructorType<T = unknown> = new (...args: unknown[]) => T;

export type Promisable<T> = T | Promise<T>;

export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Merge<T, U> = Omit<T, keyof U> & U;

export type Override<T, U> = Omit<T, keyof U> & U;

export type Diff<T, U> = Omit<T, keyof U>;

export type Intersection<T, U> = Pick<T, Extract<keyof T, keyof U>>;

export type Union<T, U> = T | U;

export type Brand<K, T> = K & { __brand: T };

export type Nullable<T> = T | null;

export type OptionalNullable<T> = T | null | undefined;

export type NonNullable<T> = T extends null | undefined ? never : T;

export type EmptyObject = Record<string, never>;

export type UnknownObject = Record<string, unknown>;

export type AnyFunction = (...args: unknown[]) => unknown;

export type NoArgsFn<T> = () => T;

export type ValueOf<T> = T[keyof T];

export type EntryOf<T> = [keyof T, T[keyof T]];

export type Entries<T> = EntryOf<T>[];

export type Keys<T> = keyof T;

export type Values<T> = T[keyof T];

export type MaybeArray<T> = T | T[];

export type Flatten<T> = T extends (infer U)[] ? U : T;

export type DeepFlatten<T> = T extends (infer U)[] 
  ? (U extends object ? DeepFlatten<U> : U) 
  : T;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IsNever<T> = [T] extends [never] ? true : false;

export type IsUnknown<T> = IsAny<T> extends true ? false : (unknown extends T ? true : false);

export type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) 
  ? true 
  : false;

export type StrictExtract<T, U> = T extends U ? (U extends T ? T : never) : never;

export type StrictExclude<T, U> = T extends U ? (U extends T ? never : T) : T;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  Required<Pick<T, Keys>>[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = 
  Pick<T, Exclude<keyof T, Keys>> & 
  { [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>[Keys] }[Keys];

export type XOR<T, U> = (T | U) extends object 
  ? (Exclude<T, U> & Partial<Omit<U, keyof T>>) | (Exclude<U, T> & Partial<Omit<T, keyof U>>) 
  : T | U;

export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export type WritableDeep<T> = { -readonly [P in keyof T]: T[P] extends object ? WritableDeep<T[P]> : T[P] };

export type Frozen<T> = { readonly [P in keyof T]: T[P] };

export type FrozenDeep<T> = { readonly [P in keyof T]: T[P] extends object ? FrozenDeep<T[P]> : T[P] };

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type PropType<T, Path extends string> = 
  Path extends `${infer K}.${infer Rest}` 
    ? K extends keyof T 
      ? PropType<T[K], Rest> 
      : never 
    : Path extends keyof T 
      ? T[Path] 
      : never;

export type Paths<T> = T extends object 
  ? { [K in keyof T & string]: T[K] extends object ? `${K}` | `${K}.${Paths<T[K]>}` : `${K}` }[keyof T & string] 
  : never;

export type Leaves<T> = T extends object 
  ? { [K in keyof T & string]: T[K] extends object ? Leaves<T[K]> : `${K}` }[keyof T & string] 
  : never;

export class TypeGuard {
  static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  static isNumber(value: unknown): value is number {
    return typeof value === 'number' && !Number.isNaN(value);
  }

  static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  static isArray<T = unknown>(value: unknown, guard?: (item: unknown) => item is T): value is T[] {
    if (!Array.isArray(value)) return false;
    if (guard) return value.every(guard);
    return true;
  }

  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static isFunction(value: unknown): value is FunctionType {
    return typeof value === 'function';
  }

  static isPromise<T = unknown>(value: unknown): value is Promise<T> {
    return value instanceof Promise;
  }

  static isNull(value: unknown): value is null {
    return value === null;
  }

  static isUndefined(value: unknown): value is undefined {
    return value === undefined;
  }

  static isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined;
  }

  static isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  static hasProperty<T extends object, K extends string>(
    obj: T,
    key: K
  ): obj is T & Record<K, unknown> {
    return key in obj;
  }

  static hasOwnProperty<T extends object, K extends string>(
    obj: T,
    key: K
  ): obj is T & Record<K, unknown> {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  static isInstanceOf<T>(value: unknown, constructor: ConstructorType<T>): value is T {
    return value instanceof constructor;
  }

  static isEqual<T>(a: T, b: T): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object' || a === null || b === null) return false;

    const keysA = Object.keys(a) as (keyof T)[];
    const keysB = Object.keys(b) as (keyof T)[];

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!TypeGuard.isEqual((a as Record<string, unknown>)[key as string], (b as Record<string, unknown>)[key as string])) {
        return false;
      }
    }

    return true;
  }
}

export type Schema<T = unknown> = {
  validate: (value: unknown) => value is T;
  parse: (value: unknown) => T;
  safeParse: (value: unknown) => { success: boolean; data?: T; error?: Error };
};

export function createSchema<T>(
  validate: (value: unknown) => value is T,
  parse: (value: unknown) => T
): Schema<T> {
  return {
    validate,
    parse,
    safeParse(value: unknown) {
      try {
        if (validate(value)) {
          return { success: true, data: value };
        }
        return { success: false, error: new Error('Validation failed') };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    },
  };
}

export const stringSchema = createSchema<string>(
  TypeGuard.isString,
  (value) => {
    if (!TypeGuard.isString(value)) throw new Error('Expected string');
    return value;
  }
);

export const numberSchema = createSchema<number>(
  TypeGuard.isNumber,
  (value) => {
    if (!TypeGuard.isNumber(value)) throw new Error('Expected number');
    return value;
  }
);

export const booleanSchema = createSchema<boolean>(
  TypeGuard.isBoolean,
  (value) => {
    if (!TypeGuard.isBoolean(value)) throw new Error('Expected boolean');
    return value;
  }
);

export const objectSchema = createSchema<Record<string, unknown>>(
  TypeGuard.isObject,
  (value) => {
    if (!TypeGuard.isObject(value)) throw new Error('Expected object');
    return value;
  }
);

export const arraySchema = <T>(itemSchema?: Schema<T>) => 
  createSchema<T[]>(
    (value): value is T[] => {
      if (!TypeGuard.isArray(value)) return false;
      if (itemSchema) return value.every(item => itemSchema.validate(item));
      return true;
    },
    (value) => {
      if (!TypeGuard.isArray(value)) throw new Error('Expected array');
      if (itemSchema) return value.map(item => itemSchema.parse(item));
      return value as T[];
    }
  );

export function unionSchema<T extends unknown[]>(
  ...schemas: { [K in keyof T]: Schema<T[K]> }
): Schema<T[number]> {
  return createSchema<T[number]>(
    (value): value is T[number] => schemas.some(schema => schema.validate(value)),
    (value) => {
      const matched = schemas.find(schema => schema.validate(value));
      if (!matched) throw new Error('Value does not match any schema');
      return matched.parse(value);
    }
  );
}

export function optionalSchema<T>(schema: Schema<T>): Schema<T | undefined> {
  return createSchema<T | undefined>(
    (value): value is T | undefined => schema.validate(value) || value === undefined,
    (value) => {
      if (value === undefined) return undefined;
      return schema.parse(value);
    }
  );
}

export function nullableSchema<T>(schema: Schema<T>): Schema<T | null> {
  return createSchema<T | null>(
    (value): value is T | null => schema.validate(value) || value === null,
    (value) => {
      if (value === null) return null;
      return schema.parse(value);
    }
  );
}
