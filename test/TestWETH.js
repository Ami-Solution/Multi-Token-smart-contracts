const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const closingHelper = require('./helpers/channelClosingHelper');
const WETH = require('Embark/contracts/WETH');
const assertRevert = require('./helpers/assertRevert');
const testConstant = require('./helpers/testConstant');
const indexes = require('./helpers/ChannelDataIndexes.js');
const BigNumber = require('bignumber.js');
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
const depositNonce = 0;
const depositAmount = 0;

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
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });
        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        dataTimeout = data[indexes.TIMEOUT];
        assert.equal(dataTimeout, timeout, "Timeout should be equal");
        assert.equal(data[indexes.USER_ADDRESS], userAddress, "User address should be equal");
        assert.equal(data[indexes.SIGNER_ADDRESS], signerAddress, "Signer address should be equal");
    });

    it("Should be able to put ETH in channel", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const channelEth = await web3.eth.getBalance(MultiChannel.options.address);

        const tokenContract = await web3.eth.getBalance(WETH.options.address);

        let channelBalance = await WETH.methods.totalSupply().call();

        assert.equal(channelBalance, 0, "WETH token should have 1000000000000000000 tokens");
        assert.equal(channelEth, 1000000000000000000, "ETH balance should not be in channel");
        assert.equal(tokenContract, 0, "WETH should have 1 ETH balance");
    });

    it("Recipient should be able to convert ETH to WETH with signer-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
        });

        const channelEth = await web3.eth.getBalance(MultiChannel.options.address);

        const tokenContract = await web3.eth.getBalance(WETH.options.address);

        let channelBalance = await WETH.methods.totalSupply().call();

        assert.equal(channelBalance, 1000000000000000000, "WETH token should have 1000000000000000000 tokens");
        assert.equal(channelEth, 0, "ETH balance should not be in channel");
        assert.equal(tokenContract, 1000000000000000000, "WETH should have 1 ETH balance");
    });

    it("User should not be able to convert ETH to WETH with self-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, userPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: userAddress
            });
            assert.fail("User should not be able to convert with self-signed signature")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to deposit with IOU nonce non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, 10, depositAmount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: recipientAddress
            });
            assert.fail("Recipient should not be able to deposit with IOU nonce which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to deposit with IOU amount non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, 15, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: recipientAddress
            });
            assert.fail("Recipient should not be able to deposit with IOU amount which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to deposit with IOU amount and nonce non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, 15, 15, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: recipientAddress
            });
            assert.fail("Recipient should not be able to deposit with IOU amount and nonce which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to deposit with IOU nonce non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, 10, depositAmount, MultiChannel.options.address, recipientPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: userAddress
            });
            assert.fail("User should not be able to deposit with IOU nonce which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to deposit with IOU amount non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, 15, MultiChannel.options.address, recipientPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: userAddress
            });
            assert.fail("User should not be able to deposit with IOU amount which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to deposit with IOU amount and nonce non zero", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, 15, 15, MultiChannel.options.address, recipientPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: userAddress
            });
            assert.fail("User should not be able to deposit with IOU amount and nonce which is nonzero ")
        } catch (error) {
            assertRevert(error);
        }
    });

    it("User should be able to convert ETH to WETH with signer-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
        });

        const channelEth = await web3.eth.getBalance(MultiChannel.options.address);

        const tokenContract = await web3.eth.getBalance(WETH.options.address);

        let channelBalance = await WETH.methods.totalSupply().call();

        assert.equal(channelBalance, 1000000000000000000, "WETH token should have 1000000000000000000 tokens");
        assert.equal(channelEth, 0, "ETH balance should not be in channel");
        assert.equal(tokenContract, 1000000000000000000, "WETH should have 1 ETH balance");
    });

    it("Non Channel Participant should not be able to convert ETH to WETH with signer-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: nonParticipantAddress
            });
            assert.fail("Recipient should not be able to convert with self-signed signature")
        }
        catch (error) {
            assertRevert(error);
        }
    });

    it("Recipient should not be able to convert ETH to WETH with self-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, recipientPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: recipientAddress
            });
            assert.fail("Recipient should not be able to convert with self-signed signature")
        }
        catch (error) {
            assertRevert(error);
        }
    });

    it("User should not be able to convert ETH to WETH with recipient-signed signature", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, recipientPk);

        try {
            await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
                from: userAddress
            });
            assert.fail("User should not be able to convert with recipient-signed signature")
        }
        catch (error) {
            assertRevert(error);
        }
    });

    it("Should be able to close WETH channel", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
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
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
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
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
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

    it("Should be able to settle with ETH with tokens not returned back to the user", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = false;
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

        let userBalanceBefore = new BigNumber(await web3.eth.getBalance(userAddress));
        let recipientBalanceBefore = new BigNumber(await web3.eth.getBalance(recipientAddress));

        let txhash = await MultiChannel.methods.settle(WETH.options.address).send({
            from: recipientAddress,
            gas: 800000,
            gasPrice: 1000
        });

        let gasUsed = txhash['cumulativeGasUsed'];

        const userBalanceAfter = new BigNumber(await web3.eth.getBalance(userAddress));
        const recipientBalanceAfter = new BigNumber(await web3.eth.getBalance(recipientAddress));

        recipientBalanceBefore = recipientBalanceBefore.plus(amount);
        recipientBalanceBefore = recipientBalanceBefore.minus(1000 * gasUsed);

        assert.ok(userBalanceAfter.isEqualTo(userBalanceBefore), "Balance should not have changed in the user address.");
        assert.ok(recipientBalanceBefore.isEqualTo(recipientBalanceAfter), "Recipient should get amountOwed");
    });

    it("Should be able to settle with ETH returned back to the user", async () => {
        await MultiChannel.methods.addChannel(WETH.options.address, userAddress, signerAddress, timeout).send({
            from: recipientAddress
        });

        await web3.eth.sendTransaction({
            from: userAddress,
            to: MultiChannel.options.address,
            value: 1000000000000000000
        });

        const depositParams = closingHelper.getClosingParameters(WETH.options.address, depositNonce, depositAmount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.deposit(WETH.options.address, depositNonce, depositAmount, depositParams.v, depositParams.r, depositParams.s, 20317).send({
            from: recipientAddress
        });

        const data = await MultiChannel.methods.getChannelData(WETH.options.address).call();

        nonce++;
        const amount = 49;
        const returnToken = true;
        const cryptoParams = closingHelper.getClosingParameters(WETH.options.address, nonce, amount, MultiChannel.options.address, signersPk);

        await MultiChannel.methods.close(WETH.options.address, nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s, returnToken).send({
            from: recipientAddress
        });

        for (i = 0; i <= timeout; i++) {
            let transaction = {
                from: nonParticipantAddress,
                to: signerAddress,
                gasPrice: 1000000000,
                value: 2
            };
            web3.eth.sendTransaction(transaction);
        }

        let userBalanceBefore = new BigNumber(await web3.eth.getBalance(userAddress));
        let recipientBalanceBefore = new BigNumber(await web3.eth.getBalance(recipientAddress));

        const txhash = await MultiChannel.methods.settle(WETH.options.address).send({
            from: recipientAddress,
            gas: 800000,
            gasPrice: 1000
        });

        let gasUsed = txhash['cumulativeGasUsed'];

        const userBalanceAfter = new BigNumber(await web3.eth.getBalance(userAddress));
        const recipientBalanceAfter = new BigNumber(await web3.eth.getBalance(recipientAddress));

        recipientBalanceBefore = recipientBalanceBefore.plus(amount);
        recipientBalanceBefore = recipientBalanceBefore.minus(1000 * gasUsed);

        userBalanceBefore = userBalanceBefore.plus(1000000000000000000);
        userBalanceBefore = userBalanceBefore.minus(amount);

        assert.ok(userBalanceBefore.isEqualTo(userBalanceAfter), "Balance should have changed in the user address.");
        assert.ok(recipientBalanceBefore.isEqualTo(recipientBalanceAfter), "Recipient should get amountOwed");
    });

    it("Non participant address should not be able to control another address's funds", async () => {
        let transaction = {
            from: nonParticipantAddress,
            to: WETH.options.address,
            value: 1000000
        };
        web3.eth.sendTransaction(transaction);

        try {
            await WETH.methods.send(signerAddress, userAddress, 10).send({
                from: nonParticipantAddress
            })
            assert.fail("You should not be able to send amounts that are not yours");
        } catch (error) {
            assertRevert(error);
        }
    });

    it("Signer address should be able to send its own funds and transfer ETH out", async () => {
        const amountSent = 100000000000;
        web3.eth.sendTransaction({
            from: signerAddress,
            to: WETH.options.address,
            value: amountSent
        });

        let userBalanceBefore = parseInt(await web3.eth.getBalance(userAddress));

        let signerBalanceBefore = new BigNumber(await WETH.methods.balanceOf(signerAddress).call());

        assert.ok(signerBalanceBefore.toString(), amountSent, "Balance of ETH and WETH should be identical");

        await WETH.methods.transfer(userAddress, amountSent).send({
            from: signerAddress
        })

        let userWETHBalance = new BigNumber(await WETH.methods.balanceOf(userAddress).call());
        assert.ok(userWETHBalance.toString(), 0, "should not have transferred WETH");

        let userBalanceAfter = parseInt(await web3.eth.getBalance(userAddress));

        userBalanceAfter -= amountSent;

        assert.equal(userBalanceBefore, userBalanceAfter);

        let nonAddressWETH = new BigNumber(await WETH.methods.balanceOf(nonParticipantAddress).call());
        assert.ok(nonAddressWETH.toString(), 0, "Should not have transferred WETH");
    });

});