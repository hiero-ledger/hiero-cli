import type { StateService } from '@/core/services/state/state-service.interface';
import type {
  ConfigOptionDescriptor,
  ConfigService,
} from './config-service.interface';

import { InternalError, ValidationError } from '@/core/errors';
import { isStringifiable } from '@/core/utils/is-stringifiable';

import { CONFIG_NAMESPACE, CONFIG_OPTIONS } from './config-service.interface';

export class ConfigServiceImpl implements ConfigService {
  private state: StateService;

  constructor(stateService: StateService) {
    this.state = stateService;
  }

  listOptions(): ConfigOptionDescriptor[] {
    return Object.entries(CONFIG_OPTIONS).map(
      ([name, spec]): ConfigOptionDescriptor => {
        const value = this.getOption(name);
        if (spec.type === 'enum') {
          return {
            name,
            type: spec.type,
            value,
            allowedValues: [...spec.allowedValues],
          };
        }
        return {
          name,
          type: spec.type,
          value,
        };
      },
    );
  }

  getOption<T = boolean | number | string>(name: string): T {
    const spec = CONFIG_OPTIONS[name];
    if (!spec) {
      throw new ValidationError(`Unknown config option: ${name}`, {
        context: { optionName: name },
      });
    }
    const raw = this.state.get<unknown>(CONFIG_NAMESPACE, name);
    if (raw === undefined || raw === null) {
      // return default
      return spec.default as unknown as T;
    }
    // basic runtime validation on read
    switch (spec.type) {
      case 'boolean':
        return Boolean(raw) as unknown as T;
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          return spec.default as unknown as T;
        }
        return n as unknown as T;
      }
      case 'string':
        if (isStringifiable(raw)) {
          return String(raw) as unknown as T;
        }
        return spec.default as unknown as T;
      case 'enum': {
        if (isStringifiable(raw)) {
          const s = String(raw);
          if (!spec.allowedValues.includes(s)) {
            return spec.default as unknown as T;
          }
          return s as unknown as T;
        }
        return spec.default as unknown as T;
      }
      default:
        return raw as T;
    }
  }

  setOption(name: string, value: boolean | number | string): void {
    const spec = CONFIG_OPTIONS[name];
    if (!spec) {
      throw new ValidationError(`Unknown config option: ${name}`, {
        context: { optionName: name },
      });
    }
    switch (spec.type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new ValidationError(
            `Invalid value for ${name}: expected boolean`,
            {
              context: { optionName: name, value, expectedType: 'boolean' },
            },
          );
        }
        this.state.set<boolean>(CONFIG_NAMESPACE, name, value);
        return;
      case 'number': {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          throw new ValidationError(
            `Invalid value for ${name}: expected number`,
            {
              context: { optionName: name, value, expectedType: 'number' },
            },
          );
        }
        this.state.set<number>(CONFIG_NAMESPACE, name, value);
        return;
      }
      case 'string': {
        if (typeof value !== 'string') {
          throw new ValidationError(
            `Invalid value for ${name}: expected string`,
            {
              context: { optionName: name, value, expectedType: 'string' },
            },
          );
        }
        this.state.set<string>(CONFIG_NAMESPACE, name, value);
        return;
      }
      case 'enum': {
        if (typeof value !== 'string' || !spec.allowedValues.includes(value)) {
          const allowed = spec.allowedValues.join(', ');
          throw new ValidationError(
            `Invalid value for ${name}: expected one of (${allowed})`,
            {
              context: {
                optionName: name,
                value,
                expectedType: 'enum',
                allowedValues: [...spec.allowedValues],
              },
            },
          );
        }
        this.state.set<string>(CONFIG_NAMESPACE, name, value);
        return;
      }
      default:
        throw new InternalError(`Unsupported option type for ${name}`, {
          context: { optionName: name },
        });
    }
  }
}
