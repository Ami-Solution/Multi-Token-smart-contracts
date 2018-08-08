# Multi-token-smart-contracts
Smart contracts for the STK token payment channel. This repo contains the logic to implement a Payment Channel using ERC20 Tokens. The files contained here are still in development and will be updated in the interests of functionality and security. This is *not* to be considered the final version. Code related comments can be sent to info@getstack.ca . We appreciate your feedback!

## Initialize

Install project dependencies

`npm install`   

## Local Development with Embark 

Our current development release uses the following versions: 
```
Embark v 3.1.5 

Solidity v0.4.23 (solc-js)

Ganache CLI v6.1.0 (ganache-core: 2.1.0)
```

By default, the repo assumes the following: 
 - address[0]: user's address 
 - address[1]: signer's address 
 - address[2]: recipient's address 
Take the above and their respective private keys and paste them in the [testConstants file](./test/helpers/testConstant.js)

### Ganache Command Line Interface 

To install, you can use `npm install -g ganache-cli`. 

Use the third private key address in the CLI and replace this with the `signerPk` in `./test/StkChannelClosing.js`. 

**Beware**: IF the tests do not work as expected, especially causing `VM Exception: Revert`, it is likely you forgot to replace the signer's private key, in which case, tests are not expected to work. 

You can start the instance using Embark through the command: `embark simulator`. Replace the port with the instances in all the tests. 

## Running Tests

Run tests using

`embark test`

## Deploy to local testnet

You can deploy your tests by running: 

`embark run testnet` 

Ensure that you have MNEMONIC and INFURA declared in your process environment. 