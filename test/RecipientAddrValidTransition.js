const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
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
const BigNumber = require('bignumber.js');
const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
let nonce = 1;

contract("Valid Recipient Addresses", function () {
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

    it("Multi Channel balance should be 50 after transferring 50 tokens", async () => {
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

        const initialCreatorBalance = await ERC20Token.methods.balanceOf(nonParticipantAddress).call();
        const stkchannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

        assert.equal(stkchannelBalance, transfer, "MultiChannel should have 50 tokens after transfer but does not");
        assert.equal(initialCreatorBalance, (initialCreation - transfer), "Initial creator should have transferred amount of tokens removed from account");


    });

    it("Recipient Address should be allowed to close the channel with a valid signature just under amount deposited", async () => {
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
        const amount = 49;
        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: recipientAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("Recipient Address should be allowed to contest the channel with valid signature equal to amount deposited", async () => {
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
        let amount = 49;
        const returnToken = false;
        let cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: recipientAddress
        });

        nonce++;
        amount = 50;
        cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, signersPk);
        await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
            from: recipientAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("Recipient Address should be able to settle after time period with 0 tokens remaining in channel", async () => {
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
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, false).send({
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

        const oldUserBalance = new BigNumber(await ERC20Token.methods.balanceOf(userAddress).call());
        const depositedTokens = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        const oldStackBalance = new BigNumber(await ERC20Token.methods.balanceOf(recipientAddress).call());
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];
        const oldChannelBalance = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = new BigNumber(await ERC20Token.methods.balanceOf(userAddress).call());
        const newStackBalance = new BigNumber(await ERC20Token.methods.balanceOf(recipientAddress).call());
        const newChannelBalance = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());


        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED]) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED]), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE]), parseInt(dataAfter[indexes.CLOSED_NONCE]), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance), parseInt(oldStackBalance) + parseInt(amountOwed), 'The stack account value should be credited');
        assert.equal(parseInt(newChannelBalance), parseInt(oldChannelBalance) - parseInt(amountOwed), 'Unspent token should remain in the channel account');
        assert.equal(parseInt(newUserBalance), parseInt(oldUserBalance), 'The User address account value should remain the same');
    });

    it("Recipient Address should be allowed to close the channel with a valid signature less than amount deposited", async () => {
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
        amount = 20;

        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, signersPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: recipientAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("Recipient Address should be allowed to settle channel with additional tokens remaining in the channel", async () => {
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
        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, validSig.v, validSig.r, validSig.s, false).send({
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

        const oldUserBalance = new BigNumber(await ERC20Token.methods.balanceOf(userAddress).call());
        const depositedTokens = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        const oldStackBalance = new BigNumber(await ERC20Token.methods.balanceOf(recipientAddress).call());
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];
        const oldChannelBalance = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = new BigNumber(await ERC20Token.methods.balanceOf(userAddress).call());
        const newStackBalance = new BigNumber(await ERC20Token.methods.balanceOf(recipientAddress).call());
        const newChannelBalance = new BigNumber(await ERC20Token.methods.balanceOf(MultiChannel.options.address).call());


        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED]) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED]), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE]), parseInt(dataAfter[indexes.CLOSED_NONCE]), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance), parseInt(oldStackBalance) + parseInt(amountOwed), 'The stack account value should be credited');
        assert.equal(parseInt(newChannelBalance), parseInt(oldChannelBalance) - parseInt(amountOwed), 'Unspent token should remain in the channel account');
        assert.equal(parseInt(newUserBalance), parseInt(oldUserBalance), 'The User address account value should remain the same');
    });

});