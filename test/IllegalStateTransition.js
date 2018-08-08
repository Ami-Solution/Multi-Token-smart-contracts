/*global contract, config, it, assert, web3*/
const STKChannel = require('Embark/contracts/STKChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const STKLibrary = require('Embark/contracts/STKLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const port = 8545;


contract("Testing Illegal State Transitions", function () {
    this.timeout(0);
    let allAccounts;
    let userAddress;
    let recipientAddress;
    const timeout = 10;
    const initialCreation = 1000000000;
    const signersPk = Buffer.from('f4ebc8adae40bfc741b0982c206061878bffed3ad1f34d67c94fa32c3d33eac8', 'hex');
    const userPk = Buffer.from('f942d5d524ec07158df4354402bfba8d928c99d0ab34d0799a6158d56156d986','hex');
    const recipientPk = Buffer.from('88f37cfbaed8c0c515c62a17a3a1ce2f397d08bbf20dcc788b69f11b5a5c9791','hex');
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

        it ("User should not be able to update an open channel", async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(STKChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(STKChannel.options.address, transfer).send({from: allAccounts[3]});

            amount = 1;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User should never be able to contest an open channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("Recipient Address should not be able to update an open channel", async() =>
        {
            amount = 1;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address should never be able to contest an open channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("User should not be able to settle an open channel", async() =>
        {
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:userAddress});
                assert.fail("User should never be able to settle an open channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("Recipient Address should not be able to update an open channel", async() =>
        {
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:recipientAddress});
                assert.fail("Recipient Address should never be able to settle an open channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })        

        it("User cannot close channel with amount greater than deposited", async() =>
        {
            const amount = 150;

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot close channel with signer address signed transaction", async() =>
        {
            nonce++; 
            const amount = 2;

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot close channel with amount greater than deposited", async() =>
        {
            const amount = 150;

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot close channel with self-signed signature", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,userPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot sign with self-signed signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot close channel with self-signed signature", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,recipientPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address cannot sign with self-signed signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot use the same nonce for contesting channel", async() =>
        {
            nonce++;
            const amount = 2;

            const properClose = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);
            await STKChannel.methods.close(ERC20Token.options.address,nonce,amount,properClose.v,properClose.r,properClose.s,true).send({from:allAccounts[1]});

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User should not use the same nonce for contest");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot use the same nonce for contesting channel", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address should not use the same nonce for contest");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot close a closed channel", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot close a closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot close a closed channel", async() =>
        {
            try
            {
                await STKChannel.methods.closeWithoutSignature().send({from:recipientAddress}); 
                assert.fail("Recipient Address should not be able to close without sig on an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User should not be able to close without signature on an already closed channel", async() =>
        {
            try
            {
                await STKChannel.methods.closeWithoutSignature().send({from:userAddress}); 
                assert.fail("User should not be able to close without sig on an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address should not be able to close without signature on an already closed channel", async() =>
        {
            try
            {
                await STKChannel.methods.closeWithoutSignature().send({from:recipientAddress}); 
                assert.fail("Recipient Address should not be able to close without sig on an already closed channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });
        it("User should not contest an amount greater than deposited", async() =>
        {
            amount = 10000;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User should not be able to update a closed channel with an amount greater than what's placed in escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address should not be able to contest an amount greater than deposited", async() =>
        {
            amount = 10000;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,STKChannel.address,signersPk);

            try
            {
                await STKChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address should not be able to update a closed channel with an amount greater than what's placed in escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User should not be able to settle before time period is over", async() =>
        {
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:userAddress});
                assert.fail("User should never be able to settle before contest period is over")
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address should not be able to settle before time period is over", async() =>
        {
            try
            {
                await STKChannel.methods.settle(ERC20Token.options.address).send({from:recipientAddress});
                assert.fail("Recipient Address should never be able to settle before contest period is over")
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

    });