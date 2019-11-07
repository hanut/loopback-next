---
lang: en
title: 'Migrating Express middleware'
keywords: LoopBack 4.0, LoopBack 4, LoopBack 3, Migration
sidebar: lb4_sidebar
permalink: /doc/en/lb4/migration-express-middleware.html
---

This is a continuation of the
"[Mounting a LoopBack 3 application](https://loopback.io/doc/en/lb4/migration-mounting-lb3app.html)"
guide. The instructions will continue with the assumption that you have a base
application set up as instructed in
[this tutorial](https://github.com/strongloop/loopback-next/tree/master/examples/lb3-application#tutorial).

Now that you have a LoopBack 3 (LB3) app mounted on a LoopBack 4 (LB4) app, it
is time to further optimize the setup so that only the bare neccessary artifacts
from the LoopBack 3 app remain. This includes moving almost all of the
middleware to a common location so that they are shared by both the LoopBack 3
and the LoopBack 4 apps.

First off, edit the LB3 app's `config.json` file.

Remove these properties, they are not required anymore:

```json
"host": "0.0.0.0",
"port": 3000,
```

Change `restApiRoot` to `/` or any path where you would like the LB3 app to be
mounted; that's relative to the LB4 app's REST API path, which defaults to
`/api`.

And then add `"handleUnknownPaths": false` to the `rest` property, this will
prevent the LB3 REST api from sending a 404 response for requests it cannot
handle.

The `config.json` file should now look like this:

{% include code-caption.html content="lb3app/server/config.json" %}

```json
{
  "restApiRoot": "/",
  "remoting": {
    "context": false,
    "rest": {
      "handleErrors": false,
      "handleUnknownPaths": false,
      "normalizeHttpPath": false,
      "xml": false
    },
    "json": {
      "strict": false,
      "limit": "100kb"
    },
    "urlencoded": {
      "extended": true,
      "limit": "100kb"
    },
    "cors": false
  }
}
```

We will be using a base Express app for mounting the LB4 app as described in
"[Creating an Express Application with LoopBack REST API](https://loopback.io/doc/en/lb4/express-with-lb4-rest-tutorial.html)"
guide.

Migrate the LB3 app's middleware from its `middleware.json` file to this Express
app, except the one from the `routes` phase (there is a
[pending task](https://github.com/strongloop/loopback-next/issues/4181) to
complete the support for this middleware).

{% include note.html content=" Each root property in the `middleware.json`
object represents a middleware phase, extract the relevant middleware and load
them in the Express app in order.

An entry like `"compression": {}` translates to `compression()`, and
`loopback#favicon` translates to `loopback.favicon()` in TypeScript. For more
details about `middleware.json`, refer to
"[its documentation](https://loopback.io/doc/en/lb3/middleware.json.html)". " %}

The `middleware.json` file should look like this now:

```js
{
  "routes": {
    "loopback#rest": {
      "paths": [
        "${restApiRoot}"
      ]
    }
  }
}
```

The middleware mounted in the Express app will be shared by both LB3 and LB4
apps.

Move any static files from the LB3 app to the `public` directory of the Express
app.

Move any non-REST routes defined anywhere in the LB3 app to the Express app.

{% include code-caption.html content="lb3app/server.ts" %}

```ts
import {ApplicationConfig} from '@loopback/core';
import * as express from 'express';
import {Request, Response} from 'express';
import * as http from 'http';
import pEvent from 'p-event';
import * as path from 'path';
// Replace CoffeeShopApplication with the name of your application
import {CoffeeShopApplication} from './application';

const loopback = require('loopback');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

export class ExpressServer {
  private app: express.Application;
  public readonly lbApp: CoffeeShopApplication;
  private server?: http.Server;

  constructor(options: ApplicationConfig = {}) {
    this.app = express();
    this.lbApp = new CoffeeShopApplication(options);

    // Middleware migrated from LoopBack 3
    this.app.use(loopback.favicon());
    this.app.use(compression());
    this.app.use(cors());
    this.app.use(helmet());

    // Mount the LB4 REST API
    this.app.use('/api', this.lbApp.requestHandler);

    // Custom Express routes
    this.app.get('/ping', function(_req: Request, res: Response) {
      res.send('pong');
    });

    // Serve static files in the public folder
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  public async boot() {
    await this.lbApp.boot();
  }

  public async start() {
    await this.lbApp.start();
    const port = this.lbApp.restServer.config.port || 3000;
    const host = this.lbApp.restServer.config.host || '127.0.0.1';
    this.server = this.app.listen(port, host);
    await pEvent(this.server, 'listening');
  }

  public async stop() {
    if (!this.server) return;
    await this.lbApp.stop();
    this.server.close();
    await pEvent(this.server, 'close');
    this.server = undefined;
  }
}
```

This app will replace the `CoffeeShopApplication` as the entry point for the
program, modify the `src/index.ts` file accordingly.

{% include code-caption.html content="src/index.ts" %}

```ts
import {ApplicationConfig} from '@loopback/core';
import {ExpressServer} from './server';

export {ExpressServer};

export async function main(options: ApplicationConfig = {}) {
  const server = new ExpressServer(options);
  await server.boot();
  await server.start();
  console.log('Server is running at http://127.0.0.1:3000');
}
```

Next, modify the `index.js` file in the root of the project to prevent the LB4
app from listening, by adding `listenOnStart: false` in `config.rest` object.
The `config` object should now look like this:

{% include code-caption.html content="index.js" %}

```js
const config = {
  rest: {
    port: +process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    openApiSpec: {
      // useful when used with OpenAPI-to-GraphQL to locate your application
      setServersFromRequest: true,
    },
    listenOnStart: false,
  },
};
```

Then, in the `bootOptions` of the `CoffeeShopApplication` class, add the
`lb3app` to configure the path of the LB3 APIs.

{% include code-caption.html content="src/application.ts" %}

```js
lb3app: {
  mode: 'fullApp';
}
```

`this.bootOptions` should now look like this:

{% include code-caption.html content="src/application.ts" %}

```ts
this.bootOptions = {
  controllers: {
    // Customize ControllerBooter Conventions here
    dirs: ['controllers'],
    extensions: ['.controller.js'],
    nested: true,
  },
  lb3app: {
    mode: 'fullApp',
  },
};
```

Start the app:

```sh
$ npm start
```

Load [http://localhost:3000/](http://localhost:3000/) on your browser. This will
load the Express app, with mounted LB3 and LB4 applications.
