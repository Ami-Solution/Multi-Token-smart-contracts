const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const allAccounts = testConstant.ACCOUNTS; 
const initialCreation = testConstant.INIT;
const timeout = testConstant.TIMEOUT;

config({
    "deployment": {
        "accounts": [
            {
                "mnemonic":testConstant.MNEMONIC,
                "numAddresses":testConstant.NUM_ADDRESS,
                "addressIndex": testConstant.INDEX,
                "hdpath":testConstant.PATH
            }
        ]},
        contracts: {
            "Token": {

            },
            "StandardToken": {

            },
            "WETHToken": {
                args:[initialCreation, "WETH", 18, "STK"],
                "instanceOf": "ERC20Token",
                "from": allAccounts[3]
            },
            "ThingToken": {
                args:[initialCreation, "Thing", 18, "THG"],
                "instanceOf": "ERC20Token",
                "from": allAccounts[3]
            },
            "ERC20Token": {
                args: [initialCreation,'STK', 18, 'STK'],
                "from": allAccounts[3]
            },
            MultiLibrary: {
                args: [
                    '$ERC20Token',
                    '0xC6eA7fD8628672780dd4F17Ffda321AA6753134B',
                    allAccounts[2],
                    allAccounts[1],
                    timeout,
                    1,
                    0,
                    0
                ],
                "fromIndex":1
            },
            "MultiChannel": {
                args: [
                    allAccounts[0],
                    allAccounts[2],
                    '$ERC20Token',
                    timeout
                ],
                "from": allAccounts[1]
            }
        }
    });

    contract("Testing Illegal State Transitions", function () {
        this.timeout(0);
        let userAddress = allAccounts[0]; 
        let recipientAddress= allAccounts[1]; 
        let signerAddress = allAccounts[2]; 
        const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
        const userPk = Buffer.from(testConstant.USER_PK,'hex');
        const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
        var nonce = 1;


        it ("User should not be able to update an open channel", async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});

            amount = 1;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);
            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
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
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);
            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
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
                await MultiChannel.methods.settle(ERC20Token.options.address).send({from:userAddress});
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
                await MultiChannel.methods.settle(ERC20Token.options.address).send({from:recipientAddress});
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

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
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

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
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

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address cannot close with amount greater than escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot close channel with self-signed signature", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,userPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User cannot sign with self-signed signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot close channel with self-signed signature", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,recipientPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
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

            const properClose = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);
            await MultiChannel.methods.close(ERC20Token.options.address,nonce,amount,properClose.v,properClose.r,properClose.s,true).send({from:allAccounts[1]});

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("User should not use the same nonce for contest");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address cannot use the same nonce for contesting channel", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Recipient Address should not use the same nonce for contest");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("User cannot close a closed channel", async() =>
        {
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
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
                await MultiChannel.methods.closeWithoutSignature().send({from:recipientAddress}); 
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
                await MultiChannel.methods.closeWithoutSignature().send({from:userAddress}); 
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
                await MultiChannel.methods.closeWithoutSignature().send({from:recipientAddress}); 
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
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:userAddress});
                assert.fail("User should not be able to update a closed channel with an amount greater than what's placed in escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient should not be able to contest an amount greater than deposited", async() =>
        {
            amount = 10000;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:recipientAddress});
                assert.fail("Recipient Address should not be able to update a closed channel with an amount greater than what's placed in escrow");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient should not be able to contest with self-signed signature", async() =>
        {
            amount = 3; 
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,recipientPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:recipientAddress});
                assert.fail("Recipient Address should not be able to contest with a self-signed signature");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });        

        it("User should not be able to contest with self-signed signature", async() =>
        {
            amount = 3; 
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,userPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:userPk});
                assert.fail("Recipient Address should not be able to contest with a self-signed signature");
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
                await MultiChannel.methods.settle(ERC20Token.options.address).send({from:userAddress});
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
                await MultiChannel.methods.settle(ERC20Token.options.address).send({from:recipientAddress});
                assert.fail("Recipient Address should never be able to settle before contest period is over")
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

        it("Recipient Address should not be able to contest after contest period is over", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }      

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:recipientAddress});
                assert.fail("Recipient Address should not be able to update a channel after contest period is over");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });        

        it("User should not be able to contest after contest period is over", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }      

            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,recipientPk);

            try
            {
                await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:userAddress});
                assert.fail("User should not be able to update a channel after contest period is over");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });          

    });