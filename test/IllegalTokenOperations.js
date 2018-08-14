
const MultiChannel = require('Embark/contracts/MultiChannel');
const ERC20Token = require('Embark/contracts/ERC20Token');
const MultiLibrary = require('Embark/contracts/MultiLibrary');
const indexes = require('./helpers/ChannelDataIndexes.js')
const StandardToken = require('Embark/contracts/StandardToken.sol');
const Token = require('Embark/contracts/Token.sol');
const MockERC223 = require('Embark/contracts/MockERC223');
const MockBurn = require('Embark/contracts/MockBurn'); 
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
        MockBurn: { 
            args:[initialCreation,"BRN",18,"BRN"], 
            from: allAccounts[3]
        },
        MockERC223: {
            args:['ERC223','223',18,initialCreation],
            from: allAccounts[3]
        },
        "NonSupply": {
            args:[0, "Thing", 18, "THG"],
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

    contract("Testing Illegal Token Operations", function () {
        this.timeout(0);
        let userAddress = allAccounts[0];
        let recipientAddress= allAccounts[1];
        let signerAddress = allAccounts[2];
        const signersPk = Buffer.from(testConstant.SIGNER_PK, 'hex');
        const userPk = Buffer.from(testConstant.USER_PK,'hex');
        const recipientPk = Buffer.from(testConstant.RECIPIENT_PK, 'hex');
        const recipientAddressPk = Buffer.from(testConstant.RECIPIENT_PK,'hex');
        var nonce = 1;

        it ("Recipient Address should be able to add tokens with 0 supply", async() =>
        {
            await MultiChannel.methods.addChannel(NonSupply.options.address,userAddress,recipientAddress,10).send({from:recipientAddress});
            assert("Recipient Address should be able to add tokens with 0 supply");
        })

        it("Recipient should not be able to transfer a token with 0 supply", async() =>
        {
            try
            {
                const transfer = 50;
                await NonSupply.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
                await NonSupply.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});
                assert.fail("Token should not allow transfer due to no supply")
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it("Recipient should not be able to close a channel with token of 0 supply", async() =>
        {
            amount = 10;
            const cryptoParams = closingHelper.getClosingParameters(NonSupply.options.address,nonce,amount,MultiChannel.address,signersPk);

            try
            {
                await MultiChannel.methods.close(NonSupply.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:recipientAddress});
                assert.fail("Should not be able to close a channel of token with 0 supply");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it("User should not be able to close a channel with token of 0 supply", async() =>
        {
            amount = 10;
            const cryptoParams = closingHelper.getClosingParameters(NonSupply.options.address,nonce,amount,MultiChannel.address,recipientAddressPk);

            try
            {
                await MultiChannel.methods.close(NonSupply.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,true).send({from:userAddress});
                assert.fail("Should not be able to close a channel of token with 0 supply");
            }
            catch (error)
            {
                assertRevert(error);
            }
        })

        it("User should be able to close without signature on a token with 0 supply", async() =>
        {
                await MultiChannel.methods.closeWithoutSignature(NonSupply.options.address).send({from:userAddress});
        })        

        it("User can still transact with other ERC20 Token", async() =>
        {
            const transfer = 50;
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});
            const initialCreatorBalance = await ERC20Token.methods.balanceOf(allAccounts[3]).call();
            const stkchannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            assert.equal(stkchannelBalance.valueOf(), transfer, "MultiChannel should have 50 tokens after transfer but does not");
            assert.equal(initialCreatorBalance.valueOf(), (initialCreation-transfer).valueOf(), "Initial creator should have transferred amount of tokens removed from account");


            nonce++;
            const amount = 49;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.options.address,recipientAddressPk);        
            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:userAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");            

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
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });

        it("MockBurn is deployed ", async() => 
        {
            let address = MockBurn.options.address;
            assert.ok(address.length > 0);
        });


        it ("Recipient should be able to add a burnable token", async() =>
        {
            var amountToUser = 50; 
            await MockBurn.methods.approve(userAddress,amountToUser).send({from: allAccounts[3]});
            await MockBurn.methods.transfer(userAddress,amountToUser).send({from: allAccounts[3]});

            var amountToChannel = 30; 
            await MockBurn.methods.approve(MultiChannel.options.address,amountToChannel).send({from: userAddress});
            await MockBurn.methods.transfer(MultiChannel.options.address,amountToChannel).send({from: userAddress});            

            await MultiChannel.methods.addChannel(MockBurn.options.address,userAddress,recipientAddress,10).send({from:recipientAddress});
            assert("Recipient Address should be able to add a Burn token");
        })

        it("User should be able to transfer burnt tokens", async() =>
        {
            var amountToUser = 50; 
            var amountToChannel = 30; 
            const initialCreatorBalance = await MockBurn.methods.balanceOf(allAccounts[3]).call();
            const stkchannelBalance = await MockBurn.methods.balanceOf(MultiChannel.options.address).call();

            assert.equal(stkchannelBalance.valueOf(), amountToChannel, "MultiChannel should have 50 tokens after transfer but does not");
            assert.equal(initialCreatorBalance.valueOf(), (initialCreation-amountToUser).valueOf(), "Initial creator should have transferred amount of tokens removed from account");         
        })

        it("User should be able to close the burt token", async() =>
        {
            var amountToUser = 50; 
            var amountToChannel = 30;             
            var amount = 10; 
            nonce++; 

            const cryptoParams = closingHelper.getClosingParameters(MockBurn.options.address,nonce,amount,MultiChannel.address,recipientAddressPk);

            await MultiChannel.methods.close(MockBurn.options.address,nonce,amount,cryptoParams.v,cryptoParams.r,cryptoParams.s,true).send({from:userAddress});
            const data  = await MultiChannel.methods.getChannelData(MockBurn.options.address).call();
            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");                  
        })

        it("User attempts to burn token", async() =>
        {
            var burnAmount=5; 
            const userBalanceBeforeBurn = await MockBurn.methods.balanceOf(userAddress).call();
            const channelBalanceBeforeBurn = await MockBurn.methods.balanceOf(MultiChannel.options.address).call();
            await MockBurn.methods.burn(burnAmount).send({from:userAddress}); 
            const userBalanceAfterBurn = await MockBurn.methods.balanceOf(userAddress).call();
            const channelBalanceAfterBurn = await MockBurn.methods.balanceOf(MultiChannel.options.address).call();
            
            assert.strictEqual(userBalanceBeforeBurn.valueOf() - userBalanceAfterBurn.valueOf(),burnAmount,"Burnt 5 tokens of the user's"); 
            assert.strictEqual(channelBalanceAfterBurn.valueOf(), channelBalanceBeforeBurn.valueOf(), "Channel balance should not have changed"); 
        })

        it("User can still transact with other ERC20 Token", async() =>
        {
            const transfer = 50;
            const leftover=1; 

            const initBalanceBeforeTransfer = await ERC20Token.methods.balanceOf(allAccounts[3]).call();
            await ERC20Token.methods.approve(MultiChannel.options.address,transfer).send({from: allAccounts[3]});
            await ERC20Token.methods.transfer(MultiChannel.options.address, transfer).send({from: allAccounts[3]});
            const initBalanceAfterTransfer = await ERC20Token.methods.balanceOf(allAccounts[3]).call();
            const stkchannelBalance = await ERC20Token.methods.balanceOf(MultiChannel.options.address).call();

            assert.equal(stkchannelBalance.valueOf(), transfer+leftover, "MultiChannel should have 50 tokens after transfer but does not");

            nonce++;
            const amount = 49;
            const returnToken = false;
            const cryptoParams = closingHelper.getClosingParameters(ERC20Token.options.address,nonce,amount,MultiChannel.options.address,recipientAddressPk);        
            await MultiChannel.methods.close(ERC20Token.options.address,nonce, amount, cryptoParams.v, cryptoParams.r, cryptoParams.s,returnToken).send({from:userAddress});
            const data  = await MultiChannel.methods.getChannelData(ERC20Token.options.address).call();

            const closedNonce = data[indexes.CLOSED_NONCE];
            const closedBlock = data[indexes.CLOSED_BLOCK];

            assert.equal(parseInt(closedNonce),nonce,"Nonces should be equal");
            assert.notEqual(parseInt(closedBlock),0,"Closed block should not be set to 0");            

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
            assert.equal(parseInt(newStackBalance.valueOf()),parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
            assert.equal(parseInt(newChannelBalance.valueOf()),parseInt(oldChannelBalance.valueOf()) - parseInt(amountOwed.valueOf()), 'Unspent token should remain in the channel account');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()), 'The User address account value should remain the same');
        });        

        it("User attempts settle burnt token channel", async() =>
        {
            const dataBefore  = await MultiChannel.methods.getChannelData(MockBurn.options.address).call();

            const depositedTokens = await MockBurn.methods.balanceOf(MultiChannel.options.address).call();
            const oldStackBalance = await MockBurn.methods.balanceOf(allAccounts[1]).call();
            const oldUserBalance = await MockBurn.methods.balanceOf(allAccounts[0]).call();
            const amountOwed = dataBefore[indexes.AMOUNT_OWED];

            await MultiChannel.methods.settle(MockBurn.options.address).send({from:allAccounts[1]});
            const dataAfter  = await MultiChannel.methods.getChannelData(MockBurn.options.address).call();

            const newUserBalance = await MockBurn.methods.balanceOf(allAccounts[0]).call();
            const newStackBalance = await MockBurn.methods.balanceOf(allAccounts[1]).call();

            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be equal to 0");
            assert.strictEqual(dataBefore[indexes.SHOULD_RETURN],true,"Should return_token should have been set to true");
            assert.ok(parseInt(dataBefore[indexes.AMOUNT_OWED].valueOf())>0,"Amount owed before settling should be greater than 0");
            assert.strictEqual(parseInt(dataAfter[indexes.AMOUNT_OWED].valueOf()),0,"Amount owed after settling should be 0");
            assert.strictEqual(parseInt(dataBefore[indexes.CLOSED_NONCE].valueOf()),parseInt(dataAfter[indexes.CLOSED_NONCE].valueOf()),"closed nonce should not have been reset on settle");
            assert.equal(parseInt(newStackBalance.valueOf()), parseInt(oldStackBalance.valueOf()) + parseInt(amountOwed.valueOf()), 'The recipientAddress account value should be credited');
            assert.equal(parseInt(newUserBalance.valueOf()),parseInt(oldUserBalance.valueOf()) + parseInt(depositedTokens.valueOf()) - parseInt(amountOwed.valueOf()),'The User address should get back the unused tokens');
        })



});