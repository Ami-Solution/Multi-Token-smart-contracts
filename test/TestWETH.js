const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const closingHelper = require('./helpers/channelClosingHelper');
const WETH = require('Embark/contracts/WETH');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const indexes = require('./helpers/ChannelDataIndexes.js')
const allAccounts = testConstant.ACCOUNTS;
const initialCreation = testConstant.INIT;
const timeout = 1;
const userAddress = allAccounts[0];
const recipientAddress = allAccounts[1];
const signerAddress = allAccounts[2];
const nonParticipantAddress = allAccounts[3];
const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
const userPk = Buffer.from(testConstant.USER_PK, 'hex');
const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
let nonce = 1;

contract("Testing WETH", function () {
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
                "WETH": {
                    from: recipientAddress
                },
                "ERC20Token": {
                    args: [initialCreation, 'STK', 18, 'STK'],
                    "from": nonParticipantAddress
                },
                MultiLibrary: {
                    args: [
                        '$ERC20Token',
                        signerAddress,
                        recipientAddress,
                        timeout,
                        1,
                        0,
                        0
                    ],
                    "fromIndex": 1
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
    it("WETH should have been deployed", async () => {
        let address = WETH.options.address;
        assert.ok(address.length > 0, "WETH should have been deployed");
    });

    it("Should be able to add a WETH channel", async () => {
        await MultiChannel.methods.addWETH(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });
        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        dataTimeout = data[indexes.TIMEOUT];
        assert.equal(dataTimeout, timeout, "Timeout should be equal");
        assert.equal(data[indexes.USER_ADDRESS], userAddress, "User address should be equal");
        assert.equal(data[indexes.SIGNER_ADDRESS], signerAddress, "Signer address should be equal");
    });

    it("Should be able to deposit WETH", async () => {
        await MultiChannel.methods.deposit(WETH.options.address).send({
            from: userAddress,
            value: '1000000000000000000'
        });

        const channelEth = await web3.eth.getBalance(MultiChannel.options.address);

        const tokenContract = await web3.eth.getBalance(WETH.options.address);

        let channelBalance = await WETH.methods.totalSupply().call();

        assert.equal(channelBalance, 1000000000000000000, "WETH token should have 1000000000000000000 tokens");
        assert.equal(channelEth, 0, "ETH balance should not be in channel");
        assert.equal(tokenContract, 1000000000000000000, "WETH should have 1 ETH balance");
    });

    it("Should be able to close WETH channel", async () => {
        await MultiChannel.methods.addWETH(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await MultiChannel.methods.deposit(WETH.options.address).send({
            from: userAddress,
            value: '1000000000000000000'
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = false;
        const cryptoParams = closingHelper.getClosingParameters(WETH.options.address, nonce, amount, MultiChannel.options.address, recipientPk);

        await MultiChannel.methods.close(WETH.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
        });

        const dataAfter = await MultiChannel.methods.getChannelData(WETH.options.address).call();
        assert.ok(dataAfter[indexes.AMOUNT_OWED], amount, "Amount owed should be set");
        assert.ok(dataAfter[indexes.CLOSED_BLOCK] > 0, "Closed block should be set");
    });

    it("Should be able to close without signature with ETH", async () => {
        await MultiChannel.methods.addWETH(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await MultiChannel.methods.deposit(WETH.options.address).send({
            from: userAddress,
            value: '1000000000000000000'
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = false;

        await MultiChannel.methods.closeWithoutSignature(WETH.options.address).send({
            from: userAddress
        });

        const dataAfter = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        assert.equal(data[indexes.TIMEOUT], timeout, "Timeout is equivalent");
        assert.ok(dataAfter[indexes.CLOSED_BLOCK] > 0, "Closed block should be set");
        assert.ok(dataAfter[indexes.AMOUNT_OWED], amount, "Amount owed should be set");
    });

    it("Should be able to close without signature with ETH", async () => {
        await MultiChannel.methods.addWETH(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await MultiChannel.methods.deposit(WETH.options.address).send({
            from: userAddress,
            value: '1000000000000000000'
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = false;

        await MultiChannel.methods.closeWithoutSignature(WETH.options.address).send({
            from: userAddress
        });

        const dataAfter = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        assert.equal(data[indexes.TIMEOUT], timeout, "Timeout is equivalent");
        assert.ok(dataAfter[indexes.CLOSED_BLOCK] > 0, "Closed block should be set");
        assert.ok(dataAfter[indexes.AMOUNT_OWED], amount, "Amount owed should be set");
    });

    it("Should be able to settle with ETH", async () => {
        await MultiChannel.methods.addWETH(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await MultiChannel.methods.deposit(WETH.options.address).send({
            from: userAddress,
            value: '1000000000000000000'
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = true;
        const cryptoParams = closingHelper.getClosingParameters(WETH.options.address, nonce, amount, MultiChannel.options.address, recipientPk);

        await MultiChannel.methods.close(WETH.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: userAddress
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

        await MultiChannel.methods.settleETH(WETH.options.address).send({
            from: recipientAddress,
            gas: 800000
        });

    });

});