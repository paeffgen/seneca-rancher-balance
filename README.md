> A [Seneca.js][] plugin that provides some ha functionality in rancher environment using [seneca-balance-client][seneca-balance-client]

# seneca-rancher-balance
[![npm version][npm-badge]][npm-url]

## Description

This module is a plugin for the Seneca framework.

## Install

```sh
npm install seneca-rancher-balance
```

And in your code:

```js
require('seneca')()
  .use('seneca-balance-client', { ... options ... })
  .use('seneca-rancher-balance', { ... options ... })
```

## Quick Example

### _client.js_

```js
require('seneca')()
    .use('seneca-balance-client').client({type: 'balance', pin: 'role:test'})
    .use('seneca-rancher-balance', {pin: 'role:test', service: 'awsome-rancher-service', port: 47111});
    ...
```

The plugin polls the rancher metadata for available ips of the provided service.
If one ip (or more) is removed from metadata the client is also removed from balanced pool.
If one ip (or more) are added, the clients are added to the balanced pool too.

## Test
To run tests, simply use npm:

```sh
npm run test
```

## License
Copyright (c) 2016, Ronny Dudeck
Licensed under [MIT][].

[MIT]: ./LICENSE
[npm-badge]: https://img.shields.io/npm/v/seneca-rancher-balance.svg
[npm-url]: https://npmjs.com/package/seneca-rancher-balance
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[seneca-balance-client]: https://github.com/rjrodger/seneca-balance-client