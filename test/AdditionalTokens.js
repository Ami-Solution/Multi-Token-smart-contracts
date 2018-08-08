/*global contract, config, it, assert, web3*/
const STKChannel = require('Embark/contracts/STKChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const STKLibrary = require('Embark/contracts/STKLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const testConstant = require('./helpers/testConstant');
const assertRevert = require('./helpers/assertRevert');
const port = 8545;


contract("Testing Additional Tokens", function () {
    this.timeout(0);
    let allAccounts;
    let userAddress;
    let recipientAddress;
    const timeout = 10;
    const initialCreation = 1000000000;
    const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
    var nonce = 1;

    config({
        deployment: {
            "host": "localhost",
            "port": port,
            "type": "rpc"
        }
    });

    before(function(done) {
        web3.eth.getAccounts(function (err, accounts) {
            if (err) {
                return done(err);
            }
            config({
                "deployment": {
                    "host": "localhost",
                    "port": port,
                    "type": "rpc",
                    "accounts": [
                        // {
                        //     "privateKeyFile": "test/helpers/privateKeys.js" // You can put more than one key, separated by , or ;
                        // },
                        // {
                        //     "mnemonic": "example exile argue silk regular smile grass bomb merge arm assist farm",
                        //     "addressIndex": "0", // Optional. The index to start getting the address
                        //     "numAddresses": "10", // Optional. The number of addresses to get
                        // }
                    ]},
                    contracts: {
                        "Token": {

                        },
                        "StandardToken": {

                        },
                        "WETHToken": {
                            args:[initialCreation, "WETH", 18, "STK"],
                            "instanceOf": "ERC20Token",
                            "fromIndex":3
                        },
                        "ThingToken": {
                            args:[initialCreation, "Thing", 18, "THG"],
                            "instanceOf": "ERC20Token",
                            "fromIndex":3
                        },
                        "ERC20Token": {
                            args: [initialCreation,'STK', 18, 'STK'],
                            "fromIndex":3
                        },
                        STKLibrary: {
                            args: [
                                '$ERC20Token',
                                accounts[0],
                                accounts[2],
                                accounts[1],
                                timeout,
                                1,
                                0,
                                0
                            ],
                            "fromIndex":1
                        },
                        "STKChannel": {
                            args: [
                                accounts[0],
                                accounts[2],
                                '$ERC20Token',
                                timeout
                            ],
                            "fromIndex":1
                        }
                    }
                }, done);
                allAccounts = accounts;
                userAddress = accounts[0];
                recipientAddress = accounts[1];
            });
        });

        it ("Non channel participant should not be able to add tokens", async() =>
        {
            try
            {
                await STKChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:address[5]})
                assert.fail("Non channel participant should never be able to add tokens");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("User should not be able to add tokens", async() =>
        {
            try
            {
                await STKChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:userAddress})
                assert.fail("User should never be able to add tokens");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("Recipient Address should be able to add tokens", async() =>
        {
            await STKChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:recipientAddress});
            assert("Recipient Address should be able to add tokens");

        })

        it ("User should not be able to add duplicate tokens", async() =>
        {
            try
            {
                await STKChannel.methods.addChannel(ThingToken.options.address,userAddress,recipientAddress,10).send({from:userAddress})
                assert.fail("User should never be able to add duplicate tokens");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("Recipient Address should not be able to add duplicate tokens", async() =>
        {
            try
            {
                await STKChannel.methods.addChannel(ThingToken.options.address,userAddress,recipientAddress,10).send({from:recipientAddress})
                assert.fail("Recipient Address should never be able to add duplicate tokens");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it("User cannot close an uninitialized channel", async() =>
        {
            const transfer = 50;
            await ThingToken.methods.approve(STKChannel.options.address,transfer).send({from: allAccounts[3]});
            await ThingToken.methods.transfer(STKChannel.options.address, transfer).send({from: allAccounts[3]});

            amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ThingToken.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot close an uninitialized channel", async() =>
        {

            amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ThingToken.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("User cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot settle an uninitialized channel", async() =>
        {

            amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.settle(ThingToken.options.address).send({from:userAddress});
                assert.fail("User cannot settle an uninitialized channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot settle an uninitialized channel", async() =>
        {

            amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.settle(ThingToken.options.address).send({from:recipientAddress});
                assert.fail("Recipient Address cannot settle an uninitialized channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

    });