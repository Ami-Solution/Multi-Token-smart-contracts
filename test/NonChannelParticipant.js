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
const userPk = Buffer.from(testConstant.USER_PK, 'hex');
const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
const nonParticipantPK = Buffer.from(testConstant.NON_PARTICIPANT, 'hex'); 
let nonce = 1;

contract("Non Channel Participant Actions", function () {
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
                    args: [],
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

    it("Cannot close a channel with valid signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });


        const amount = 5;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to close an open channel with a valid signature");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot close open channel without signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });


        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: nonParticipantAddress
            });
            assert.fail("Cannot close without signature");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot close a channel with an invalid signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });


        nonce++;
        const amount = 5;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, nonParticipantPK);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: nonParticipantAddress
            });
            assert.fail("Self signed signature should be invalid");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot close a closed channel with valid signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        
        nonce++;
        const amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: nonParticipantAddress
            });
            assert.fail("Proper signed signature should not be able to close an already closed channel");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Cannot close a closed channel without signature", async () => {
        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: nonParticipantAddress
            });
            assert.fail("Cannot close an already closed channel without signature");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot close without signature on closed channel", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });

        let amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });

        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: nonParticipantAddress
            });
            assert.fail("Cannot close without signature");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    });

    it("Cannot contest an open channel with a valid signature", async () => {
        nonce++;
        const amount = 2;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to change the state of an open channel");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot contest an open channel with an invalid signature", async () => {
        nonce++;
        const amount = 2;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, nonParticipantPK);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to change the state of an open channel");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot settle an open channel", async () => {
        nonce++;
        const amount = 2;

        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to change the state of an open channel");
        } catch (error) {
            assertRevert(error);
            assert.ok(true);
        }
    })

    it("Cannot contest channel with valid signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });

        let amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });

        nonce++;
        amount = 2;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to contest channel with valid signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Cannot contest channel with invalid signature", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });

        let amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });

        nonce++;
        amount = 2;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, nonParticipantPK);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Should not be able to contest channel with invalid signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Cannot contest channel with valid signature after timeout", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });

        let amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });

    
        for (i = 0; i <= timeout; i++) {
            let transaction = {
                from: nonParticipantAddress,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }
        nonce++;
        amount = 2;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Should not be able to contest channel with invalid signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Cannot contest channel with invalid signature past timeout period", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(userAddress, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: userAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: userAddress
        });

        let amount = 2;

        const validSig = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, true).send({
            from: recipientAddress
        });


        for (i = 0; i <= timeout; i++) {
            let transaction = {
                from: nonParticipantAddress,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }
        nonce++;
        amount = 2;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, nonParticipantPK);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant should not be able to contest");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Cannot settle a closed channel", async () => {
        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: nonParticipantAddress
            });
            assert.fail("Non channel participant cannot change state of channel");
        } catch (error) {
            assertRevert(error);
        }
    });

});