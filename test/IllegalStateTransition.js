const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const closingHelper = require('./helpers/channelClosingHelper');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const allAccounts = testConstant.ACCOUNTS;
const initialCreation = testConstant.INIT;
const timeout = testConstant.TIMEOUT;
let userAddress = allAccounts[0];
let recipientAddress = allAccounts[1];
let signerAddress = allAccounts[2];
let nonParticipantAddress = allAccounts[3];
const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
const userPk = Buffer.from(testConstant.USER_PK, 'hex');
const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
var nonce = 1;
var amount;

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
        "Token": {

        },
        "StandardToken": {

        },
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
            args: [
                '$ERC20Token',
                '0xC6eA7fD8628672780dd4F17Ffda321AA6753134B',
                userAddress,
                signerAddress,
                timeout,
                1,
                0,
                0
            ],
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
});

contract("Testing Illegal State Transitions", function () {
    this.timeout(0);

    it("User should not be able to update an open channel", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonParticipantAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonParticipantAddress
        });

        amount = 1;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: userAddress
            });
            assert.fail("User should never be able to contest an open channel");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("Recipient Address should not be able to update an open channel", async () => {
        amount = 1;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);
        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should never be able to contest an open channel");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("User should not be able to settle an open channel", async () => {
        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: userAddress
            });
            assert.fail("User should never be able to settle an open channel");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("Recipient Address should not be able to update an open channel", async () => {
        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should never be able to settle an open channel");
        } catch (error) {
            assertRevert(error);
        }
    })

    it("User cannot close channel with amount greater than deposited", async () => {
        nonce++;
        const amount = 150;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk); 
        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            assert.fail("User cannot close with amount greater than escrow");
        } catch (error) {
            assertRevert(error);
        }
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        console.log("open"); 
        console.log(data);         
    });

    it("User cannot close channel with signer address signed transaction", async () => {
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        console.log("open"); 
        console.log(data);          
        console.log("nonce: " + nonce + " amount : " + amount); 

        nonce++;
        amount = 2;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
            console.log("closed?"); 
            console.log(dataAfter);          
            console.log(userAddress); 
            console.log(signersPk); 
            console.log(signerAddress); 
            console.log(allAccounts);
            assert.fail("User cannot close channel with signer address");
        } catch (error) {
            assertRevert(error);
        }      
    });

    it("Recipient Address cannot close channel with amount greater than deposited", async () => {         

        amount = 150;

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address cannot close with amount greater than escrow");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User cannot close channel with self-signed signature", async () => {
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, userPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            assert.fail("User cannot sign with self-signed signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address cannot close channel with self-signed signature", async () => {
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, recipientPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address cannot sign with self-signed signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User cannot use the same nonce for contesting channel", async () => {
        const amount = 2;



        const properClose = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        console.log(amount);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, properClose.v, properClose.r, properClose.s, true).send({
            from: recipientAddress
        });

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            assert.fail("User should not use the same nonce for contest");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address cannot use the same nonce for contesting channel", async () => {
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not use the same nonce for contest");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User cannot close a closed channel", async () => {
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, true).send({
                from: userAddress
            });
            assert.fail("User cannot close a closed channel");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address cannot close a closed channel", async () => {
        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not be able to close without sig on an already closed channel");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to close without signature on an already closed channel", async () => {
        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: userAddress
            });
            assert.fail("User should not be able to close without sig on an already closed channel");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address should not be able to close without signature on an already closed channel", async () => {
        try {
            await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not be able to close without sig on an already closed channel");
        } catch (error) {
            assertRevert(error);
        }
    });
    it("User should not contest an amount greater than deposited", async () => {
        amount = 10000;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: userAddress
            });
            assert.fail("User should not be able to update a closed channel with an amount greater than what's placed in escrow");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to contest an amount greater than deposited", async () => {
        amount = 10000;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not be able to update a closed channel with an amount greater than what's placed in escrow");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to contest with self-signed signature", async () => {
        amount = 3;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, recipientPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not be able to contest with a self-signed signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to contest with self-signed signature", async () => {
        amount = 3;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, userPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: userPk
            });
            assert.fail("Recipient Address should not be able to contest with a self-signed signature");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to settle before time period is over", async () => {
        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: userAddress
            });
            assert.fail("User should never be able to settle before contest period is over")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address should not be able to settle before time period is over", async () => {
        try {
            await MultiChannel.methods.settle(ERC20Token.options.address).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should never be able to settle before contest period is over")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient Address should not be able to contest after contest period is over", async () => {
        const amount = 1;
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonParticipantAddress,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: recipientAddress
            });
            assert.fail("Recipient Address should not be able to update a channel after contest period is over");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to contest after contest period is over", async () => {
        const amount = 1;
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonParticipantAddress,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, recipientPk);

        try {
            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
                from: userAddress
            });
            assert.fail("User should not be able to update a channel after contest period is over");
        } catch (error) {
            assertRevert(error);
        }
    });

});