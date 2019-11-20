// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/extension-logging
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {intercept} from '@loopback/context';
import {LoggingBindings} from '../keys';

/**
 * @log decorator for method invocations.
 *
 * @example
 * ```ts
 * import {log} from '@loopback/extension-logging';
 *
 * export class HelloController {
 *   @log()
 *   hello(name: string) {
 *     return `Hello, ${name}`;
 *   }
 * }
 * ```
 */
export function log() {
  // A shortcut to `@intercept` that invokes the winston interceptor that logs
  // method invocations
  return intercept(LoggingBindings.WINSTON_INTERCEPTOR);
}
