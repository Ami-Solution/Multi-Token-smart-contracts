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
let userAddress = allAccounts[0];
let recipientAddress = allAccounts[1];
let signerAddress = allAccounts[2];
let nonChannelParticipant = allAccounts[3];

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
            "from": nonChannelParticipant
        },
        "ThingToken": {
            args: [initialCreation, "Thing", 18, "THG"],
            "instanceOf": "ERC20Token",
            "from": nonChannelParticipant
        },
        "ERC20Token": {
            args: [initialCreation, 'STK', 18, 'STK'],
            "from": nonChannelParticipant
        },
        MultiLibrary: {
            args: [
                '$ERC20Token',
                '0xC6eA7fD8628672780dd4F17Ffda321AA6753134B',
                signerAddress,
                recipientAddress,
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

contract("Testing Valid Transactions made by User", function () {
    this.timeout(0);
    const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
    const userPk = Buffer.from(testConstant.USER_PK, 'hex');
    const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
    const recipientAddressPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
    var nonce = 1;

    it("Multi Channel balance should be 50 after transferring 50 tokens", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        const initialCreatorBalance = await ERC20Token.methods.balanceOf(nonChannelParticipant).call();
        const stkchannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

        assert.equal(stkchannelBalance.valueOf(), transfer, "MultiChannel should have 50 tokens after transfer but does not");
        assert.equal(initialCreatorBalance.valueOf(), (initialCreation - transfer).valueOf(), "Initial creator should have transferred amount of tokens removed from account");
    })

    it("User should be allowed to close the channel with a valid signature just under amount deposited", async () => {
        nonce++;
        const amount = 49;
        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, recipientAddressPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User should be allowed to contest the channel with valid signature equal to amount deposited", async () => {
        nonce++;
        const amount = 50;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, recipientPk);

        await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User should be able to settle after time period with 0 tokens remaining in channel", async () => {
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonChannelParticipant,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        const oldUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        const oldStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];
        const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const newStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()), parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
        assert.equal(parseInt(newChannelBalance.valueOf()), parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
        assert.equal(parseInt(newUserBalance.valueOf()), parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
    });

    it("User should be allowed to close the channel with a valid signature less than amount deposited", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        nonce++;
        const amount = 20;

        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, recipientAddressPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User should be allowed to settle channel with additional tokens remaining in the channel", async () => {
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonChannelParticipant,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        const oldUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        const oldStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];
        const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const newStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()), parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
        assert.equal(parseInt(newChannelBalance.valueOf()), parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
        assert.equal(parseInt(newUserBalance.valueOf()), parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
    });


    it("User can close a channel with just under deposited", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        nonce++;
        const amount = 49;
        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, recipientAddressPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User can update closed channel with amount equivalent to deposited", async () => {
        nonce++;
        const amount = 50;
        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.address, recipientPk);

        await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User can settle with funds returned back to user", async () => {
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonChannelParticipant,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        const oldUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
        const oldStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];
        const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const newStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()), parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
        assert.equal(parseInt(newChannelBalance.valueOf()), parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
        assert.equal(parseInt(newUserBalance.valueOf()), parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
    });

    it("User can close channel with amount just under deposited", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: nonChannelParticipant
        });
        nonce++;
        const amount = 49;
        const returnToken = true;
        const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address, nonce, amount, MultiChannel.options.address, recipientAddressPk);

        await MultiChannel.methods.close(ERC20Token.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const closedNonce = data[indexes.CLOSED_NONCE];
        const closedBlock = data[indexes.CLOSED_BLOCK];

        assert.equal(parseInt(closedNonce), nonce, "Nonces should be equal");
        assert.notEqual(parseInt(closedBlock), 0, "Closed block should not be set to 0");
    });

    it("User can settle channel with funds returned", async () => {
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonChannelParticipant,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
        const oldStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const oldUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const newStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();

        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()) > 0, "Amount owed before settling should be equal to 0");
        assert.strictEqual(dataBefore[indexes.SHOULD_RETURN], true, "Should return_token should have been set to true");
        assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()) > 0, "Amount owed before settling should be greater than 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()), parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
        assert.equal(parseInt(newUserBalance.valueOf()), parseInt(oldUserBalance.valueOf()) + parseInt(depositedTokens.valueOf()) - parseInt(amountOwed.valueOf()), 'The User address should get back the unused tokens');
    });

    it("User can close without signature if no IOUs exist", async () => {
        const transfer = 50;
        await ERC20Token.methods.approve(MultiChannel.options.address, transfer).send({
            from: signerAddress
        });
        await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({
            from: signerAddress
        });

        await MultiChannel.methods.closeWithoutSignature(ERC20Token.options.address).send({
            from: userAddress
        });
        const data = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        assert.strictEqual(data[indexes.SHOULD_RETURN], true, "Close without signature should set retunToken to true");
        assert(data[indexes.CLOSED_BLOCK] > 0, "closed block should be greater than 0");
    });

    it("User settling funds must return after closeWithoutSig", async () => {
        for (i = 0; i <= timeout; i++) {
            var transaction = {
                from: nonChannelParticipant,
                to: userAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }
        const dataBefore = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
        const oldStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();
        const oldUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const amountOwed = dataBefore[indexes.AMOUNT_OWED];

        await MultiChannel.methods.settle(ERC20Token.options.address).send({
            from: recipientAddress
        });
        const dataAfter = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

        const newUserBalance = await ERC20Token.methods.balanceOf(userAddress).call();
        const newStackBalance = await ERC20Token.methods.balanceOf(recipientAddress).call();

        assert.strictEqual(dataBefore[indexes.SHOULD_RETURN], true, "Should return_token should have been set to true");
        assert.strictEqual(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed before settling should be equal to 0");
        assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()), 0, "Amount owed after settling should be 0");
        assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()), parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()), "closed nonce should not have been reset on settle");
        assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
        assert.equal(parseInt(newUserBalance.valueOf()), parseInt(oldUserBalance.valueOf()) + parseInt(depositedTokens.valueOf()) - parseInt(amountOwed.valueOf()), 'The User address should get back the unused tokens');
    });
});