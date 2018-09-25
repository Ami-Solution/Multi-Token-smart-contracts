const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const allAccounts = testConstant.ACCOUNTS;
const initialCreation = testConstant.INIT;
const timeout = testConstant.TIMEOUT;
const userAddress = allAccounts[0];
const recipientAddress = allAccounts[1];
const signerAddress = allAccounts[2]; 
const nonParticipantAddress = allAccounts[3];
const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
let nonce = 1;

contract("Additional Token Tests", function () {
    beforeEach((done) => {
        config({
            "deployment": {
                "accounts": [{
                    "mnemonic": testConstant.MNEMONIC,
                    "numAddresses": testConstant.NUM_ADDRESS,
                    "addressIndex": testConstant.INDEX,
                    "hdpath": testConstant.PATH
                }]
            },
            contracts: {
                "WETHToken": {
                    args: [initialCreation, "WETH", 18, "STK"],
                    "instanceOf": "ERC20Token",
                    "from": nonParticipantAddress
                },
                "ThingToken": {
                    args: [initialCreation, "Thing", 18, "THG"],
                    "instanceOf": "ERC20Token",
                    "from": nonParticipantAddress
                },
                "ERC20Token": {
                    args: [initialCreation, 'STK', 18, 'STK'],
                    "from": nonParticipantAddress
                },
                MultiLibrary: {
                    "from": recipientAddress
                },
                "MultiChannel": {
                    args: [
                        userAddress,
                        signerAddress,
                        '$ERC20Token',
                        timeout
                    ],
                    "from": recipientAddress
                }
            }
        }, done);
    });
    it("Non channel participant should not be able to add tokens", async () => {
        try {
            await MultiChannel.methods.addChannel(WETHToken.options.address, userAddress, recipientAddress, 10).send({
                from: nonParticipantAddress
            })
            assert.fail("Non channel participant should never be able to add tokens");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("User should not be able to add tokens", async () => {
        try {
            await MultiChannel.methods.addChannel(WETHToken.options.address, userAddress, recipientAddress, 10).send({
                from: userAddress
            })
            assert.fail("User should never be able to add tokens");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("Recipient Address should be able to add tokens", async () => {
        await MultiChannel.methods.addChannel(WETHToken.options.address, userAddress, recipientAddress, 10).send({
            from: recipientAddress
        });
        assert("Recipient Address should be able to add tokens");

    })

    it("User should not be able to add duplicate tokens", async () => {
        await MultiChannel.methods.addChannel(ThingToken.options.address, userAddress, recipientAddress, 10).send({
            from: recipientAddress
        });        
        try {
            await MultiChannel.methods.addChannel(ThingToken.options.address, userAddress, recipientAddress, 10).send({
                from: userAddress
            })
            assert.fail("User should never be able to add duplicate tokens");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("Recipient Address should not be able to add duplicate tokens", async () => {
        await MultiChannel.methods.addChannel(ThingToken.options.address, userAddress, recipientAddress, 10).send({
            from: recipientAddress
        });         
        try {
            await MultiChannel.methods.addChannel(ThingToken.options.address, userAddress, recipientAddress, 10).send({
                from: recipientAddress
            })
            assert.fail("Recipient Address should never be able to add duplicate tokens");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("User cannot close an uninitialized channel", async () => {
        const transfer = 50;
        await ThingToken.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonParticipantAddress
        });
        await ThingToken.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonParticipantAddress
        });

        let amount = 0;
        const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ThingToken.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            assert.fail("User cannot close with amount greater than escrow");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address cannot close an uninitialized channel", async () => {

        let amount = 0;
        const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ThingToken.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: recipientAddress
            });
            assert.fail("User cannot close with amount greater than escrow");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User cannot settle an uninitialized channel", async () => {

        let amount = 0;
        const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.settle(ThingToken.options.address).send({
                from: userAddress
            });
            assert.fail("User cannot settle an uninitialized channel");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address cannot settle an uninitialized channel", async () => {

        let amount = 0;
        const cryptoParams = closingHelper.getClosingParameters(ThingToken.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.settle(ThingToken.options.address).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address cannot settle an uninitialized channel");
        } catch (error) {
            assertRevert(error);
        }
    });

});