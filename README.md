# Multi-token-smart-contracts
Smart contracts for the Multitoken token payment channel. This repo contains the logic to implement a Payment Channel using ERC20 Tokens. The files contained here are still in development and will be updated in the interests of functionality and security. This is *not* to be considered the final version. Code related comments can be posted in our issues. We appreciate your feedback!

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

### Ganache Command Line Interface  

Embark will start the `ganache-cli` instance. Our settings in the constant file will ensure that your environment is properly set up for you. 

## Running Tests

Run tests using

`embark test`

## Deploy to local testnet

You can deploy your tests by running: 

`embark run testnet` 

Ensure that you have MNEMONIC and INFURA declared in your process environment. 

## Running on Remix 

If you want to give our code a try on REMIX, you can use our signing library by inserting the required addresses [on how to sign transactions](https://github.com/STKtoken/Multi-Token-smart-contracts/wiki/How-to-Sign-Transactions). 

You can run it using `node generateMultitokenKey.js`. Have fun! 

If you run into any problems, please create an Issue and we would be happy look into it! 
