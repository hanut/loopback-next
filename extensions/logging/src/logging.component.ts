// Copyright IBM Corp. 2019. All Rights Reserved.
// Node module: @loopback/extension-logging
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  bind,
  Binding,
  Component,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config,
  ContextTags,
  extensionFor,
  ProviderMap,
} from '@loopback/core';
import {FluentSenderProvider, FluentTransportProvider} from './fluent';
import {AccessLogInterceptor, LoggingInterceptor} from './interceptors';
import {LoggingBindings} from './keys';
import {WinstonLoggerProvider, WINSTON_TRANSPORT} from './winston';

/**
 * Configuration for LoggingComponent
 */
export type LoggingComponentConfig = {
  enableFluent?: boolean;
  enableAccessLog?: boolean;
};

/**
 * A component providing logging facilities
 */
@bind({tags: {[ContextTags.KEY]: LoggingBindings.COMPONENT}})
export class LoggingComponent implements Component {
  providers: ProviderMap;
  bindings: Binding<unknown>[];

  constructor(
    @config()
    loggingConfig: LoggingComponentConfig | undefined,
  ) {
    loggingConfig = {
      enableFluent: true,
      enableAccessLog: true,
      ...loggingConfig,
    };
    this.providers = {
      [LoggingBindings.WINSTON_LOGGER.key]: WinstonLoggerProvider,
      [LoggingBindings.WINSTON_INTERCEPTOR.key]: LoggingInterceptor,
    };

    if (loggingConfig.enableAccessLog) {
      this.providers[
        LoggingBindings.WINSTON_ACCESS_LOGGER.key
      ] = AccessLogInterceptor;
    }

    if (loggingConfig.enableFluent) {
      this.providers[LoggingBindings.FLUENT_SENDER.key] = FluentSenderProvider;
      // Only create fluent transport if it's configured
      this.bindings = [
        Binding.bind(LoggingBindings.WINSTON_TRANSPORT_FLUENT)
          .toProvider(FluentTransportProvider)
          .apply(extensionFor(WINSTON_TRANSPORT)),
      ];
    }
  }
}
