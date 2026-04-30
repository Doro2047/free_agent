import { State, StoreApi } from 'zustand'
import { persist, type PersistOptions } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type Middleware<T extends State> = (
  f: (config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T) => StoreApi<T>,
) => (config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T) => StoreApi<T>

export interface StoreConfig<T extends State> {
  name: string
  persist?: boolean
  partialize?: (state: T) => Partial<T>
  devtools?: boolean
}

export const createEnhancedStore = <T extends State>(
  config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T,
  options?: StoreConfig<T>,
) => {
  let middleware: Middleware<T> = (f) => f

  if (options?.persist) {
    const persistOptions: PersistOptions<T> = {
      name: options.name,
      ...(options.partialize && { partialize: options.partialize }),
    }
    middleware = (f) => persist(immer(f), persistOptions)
  } else {
    middleware = immer
  }

  return middleware(config)
}

export const loggerMiddleware =
  <T extends State>() =>
  (next: (config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T) => StoreApi<T>) =>
  (config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T) => {
    const store = next(config)
    const originalSetState = store.setState

    store.setState = (state, replace) => {
      console.debug('[Zustand Store Update]:', state)
      originalSetState(state, replace)
    }

    return store
  }

export { persist, immer }
