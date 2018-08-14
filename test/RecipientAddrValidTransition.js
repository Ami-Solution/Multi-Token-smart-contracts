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

    contract("Testing Valid Recipient Transactions", function () {
        this.timeout(0);
        let userAddress = allAccounts[0]; 
        let recipientAddress= allAccounts[1]; 
        let signerAddress = allAccounts[2]; 
        const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
        const userPk = Buffer.from(testConstant.USER_PK,'hex');
        const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
        const recipientAddressPk = Buffer.from(testConstant.RECIPIENT_PK,'hex');
        var nonce = 1;


        it("Multi Channel balance should be 50 after transferring 50 tokens",async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});
            const initialCreatorBalance = await ERC20Token.methods.balanceOf(allAccounts[3]).call();
            const stkchannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            assert.equal(stkchannelBalance.valueOf(), transfer, "MultiChannel should have 50 tokens after transfer but does not");
            assert.equal(initialCreatorBalance.valueOf(), (initialCreation-transfer).valueOf(), "Initial creator should have transferred amount of tokens removed from account");
        })

        it("Recipient Address should be allowed to close the channel with a valid signature just under amount deposited", async() =>
        {
            nonce++;
            const amount = 49;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.options.address,signersPk);

            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });

        it("Recipient Address should be allowed to contest the channel with valid signature equal to amount deposited", async() =>
        {
            nonce++;
            const amount = 50;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });

        it("Recipient Address should be able to settle after time period with 0 tokens remaining in channel", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }

            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
            const dataBefore  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            await MultiChannel.methods.settle(ERC20Token.options.address).send({from:allAccounts[1]});
            const dataAfter  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });

        it("Recipient Address should be allowed to close the channel with a valid signature less than amount deposited", async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});
            nonce++;
            const amount = 20;

            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });

        it("Recipient Address should be allowed to settle channel with additional tokens remaining in the channel", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }

            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
            const dataBefore  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            await MultiChannel.methods.settle(ERC20Token.options.address).send({from:allAccounts[1]});
            const dataAfter  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });


        it("Recipient Address can close a channel with just under deposited", async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});            
            nonce++;
            const amount = 49;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.options.address,signersPk);

            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });

        it("Recipient Address can update closed channel with amount equivalent to deposited", async() =>
        {
            nonce++;
            const amount = 50;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.address,signersPk);

            await MultiChannel.methods.updateClosedChannel(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        });

        it("Recipient Address can settle with funds returned back to user", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }

            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
            const dataBefore  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            await MultiChannel.methods.settle(ERC20Token.options.address).send({from:allAccounts[1]});
            const dataAfter  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });

        it ("Recipient Address can close channel with amount just under deposited", async () => 
        { 
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});                        
            nonce++;
            const amount = 49;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.options.address,signersPk);

            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:recipientAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");
        }); 

        it("Recipient Address can settle channel with funds returned", async() =>
        {
            for (i = 0; i<=timeout; i++)
            {
                var transaction = {from:allAccounts[7],to:allAccounts[8],gasPrice:1000000000,value:2};
                web3.eth.sendTransaction(transaction);
            }

            const oldUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const depositedTokens = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();
            const dataBefore  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();
            const oldStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];
            const oldChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            await MultiChannel.methods.settle(ERC20Token.options.address).send({from:allAccounts[1]});
            const dataAfter  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const newUserBalance = await ERC20Token.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await ERC20Token.methods.balanceOf(allAccounts[1]).call();
            const newChannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();


            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The stack account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });

    });