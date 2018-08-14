
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

    contract("Testing Users Adding Other Tokens", function () {
        this.timeout(0);
        let userAddress = allAccounts[0]; 
        let recipientAddress= allAccounts[1]; 
        let signerAddress = allAccounts[2]; 
        const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
        const userPk = Buffer.from(testConstant.USER_PK,'hex');
        const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
        const recipientAddressPk = Buffer.from(testConstant.RECIPIENT_PK,'hex');
        var nonce = 1;
        
        it ("Non channel participant should not be able to add tokens", async() =>
        {
            try
            {
                await MultiChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:address[5]})
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
                await MultiChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:userAddress})
                assert.fail("User should never be able to add tokens");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it ("Recipient Address should be able to add tokens", async() =>
        {
            await MultiChannel.methods.addChannel(WETHToken.options.address,userAddress,recipientAddress,10).send({from:recipientAddress});
            assert("Recipient Address should be able to add tokens");

        })

        it ("User should not be able to add duplicate tokens", async() =>
        {
            try
            {
                await MultiChannel.methods.addChannel(ThingToken.options.address,userAddress,recipientAddress,10).send({from:userAddress})
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
                await MultiChannel.methods.addChannel(ThingToken.options.address,userAddress,recipientAddress,10).send({from:recipientAddress})
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
            await ThingToken.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ThingToken.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});

            amount = 0;
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ThingToken.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
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
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(ThingToken.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
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
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.settle(ThingToken.options.address).send({from:userAddress});
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
            const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.settle(ThingToken.options.address).send({from:recipientAddress});
                assert.fail("Recipient Address cannot settle an uninitialized channel");
            }
            catch (error)
            {
                assertRevert(error);
            }
        });

    });